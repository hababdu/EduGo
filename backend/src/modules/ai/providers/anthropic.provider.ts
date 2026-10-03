// src/modules/ai/providers/anthropic.provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../ai.config';
import {
  AiContentBlock,
  AiMessage,
  AiProvider,
  AiProviderError,
  AiRequest,
  AiResponse,
  AiStopReason,
  AiStreamEvent,
  AiToolUseBlock,
} from '../ai.types';
import { postJson, toProviderError } from '../http.util';
import { parseSse } from '../sse.util';

const API_VERSION = '2023-06-01';

/** Umumiy xabarlarni Anthropic Messages API formatiga o'giradi (sof funksiya). */
export function toAnthropicMessages(messages: AiMessage[]) {
  return messages.map((m) => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content };
    const blocks = m.content
      .map((b) => {
        switch (b.type) {
          case 'text':
            return b.text ? { type: 'text', text: b.text } : null; // bo'sh matn blokini Anthropic rad etadi
          case 'tool_use':
            return { type: 'tool_use', id: b.id, name: b.name, input: b.input ?? {} };
          case 'tool_result':
            return {
              type: 'tool_result',
              tool_use_id: b.toolUseId,
              content: b.content,
              ...(b.isError ? { is_error: true } : {}),
            };
        }
      })
      .filter(Boolean);
    return { role: m.role, content: blocks };
  });
}

function mapStop(reason?: string): AiStopReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'end';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    default:
      return 'other';
  }
}

function buildResponse(
  content: AiContentBlock[],
  stop: AiStopReason,
  usage: { inputTokens: number; outputTokens: number },
  model: string,
): AiResponse {
  return {
    text: content.map((b) => (b.type === 'text' ? b.text : '')).join(''),
    content,
    toolCalls: content.filter((b): b is AiToolUseBlock => b.type === 'tool_use'),
    stopReason: stop,
    usage,
    model,
  };
}

@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;

  constructor(
    private readonly env: ConfigService,
    private readonly cfg: AiConfig,
  ) {}

  isConfigured(): boolean {
    return !!this.env.get<string>('ANTHROPIC_API_KEY');
  }

  private url(): string {
    // ANTHROPIC_BASE_URL — proksi/shlyuz orqali ulanish kerak bo'lsa
    const base = this.env.get<string>('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com';
    return `${base.replace(/\/+$/, '')}/v1/messages`;
  }

  private headers(): Record<string, string> {
    return {
      'x-api-key': this.env.get<string>('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': API_VERSION,
    };
  }

  private body(req: AiRequest, model: string, stream: boolean) {
    return {
      model,
      max_tokens: req.maxTokens ?? this.cfg.defaultMaxTokens, // Anthropic'da majburiy
      ...(req.system ? { system: req.system } : {}),
      messages: toAnthropicMessages(req.messages),
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema,
            })),
          }
        : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  async complete(req: AiRequest, model: string): Promise<AiResponse> {
    const { res, release } = await postJson(
      this.url(),
      this.headers(),
      this.body(req, model, false),
      this.cfg.timeoutMs,
    );
    try {
      const data: any = await res.json();
      const content: AiContentBlock[] = [];
      for (const b of data.content ?? []) {
        if (b.type === 'text') content.push({ type: 'text', text: b.text ?? '' });
        else if (b.type === 'tool_use')
          content.push({ type: 'tool_use', id: b.id, name: b.name, input: b.input ?? {} });
      }
      return buildResponse(
        content,
        mapStop(data.stop_reason),
        {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
        data.model ?? model,
      );
    } catch (e) {
      throw toProviderError(e);
    } finally {
      release();
    }
  }

  async *stream(req: AiRequest, model: string): AsyncGenerator<AiStreamEvent> {
    const { res, release } = await postJson(
      this.url(),
      this.headers(),
      this.body(req, model, true),
      this.cfg.streamTimeoutMs,
    );

    type Acc = { type: 'text' | 'tool_use'; id?: string; name?: string; text: string; json: string };
    const blocks = new Map<number, Acc>();
    let inputTokens = 0;
    let outputTokens = 0;
    let stop: AiStopReason = 'other';
    let usedModel = model;

    const parseInput = (json: string): Record<string, unknown> => {
      try {
        return json ? JSON.parse(json) : {};
      } catch {
        return {};
      }
    };

    try {
      for await (const msg of parseSse(res.body)) {
        let ev: any;
        try {
          ev = JSON.parse(msg.data);
        } catch {
          continue;
        }

        switch (ev.type) {
          case 'message_start':
            inputTokens = ev.message?.usage?.input_tokens ?? 0;
            outputTokens = ev.message?.usage?.output_tokens ?? 0;
            usedModel = ev.message?.model ?? usedModel;
            break;

          case 'content_block_start': {
            const cb = ev.content_block;
            if (cb?.type === 'text' || cb?.type === 'tool_use') {
              blocks.set(ev.index, {
                type: cb.type,
                id: cb.id,
                name: cb.name,
                text: cb.text ?? '',
                json: '',
              });
            }
            break;
          }

          case 'content_block_delta': {
            const b = blocks.get(ev.index);
            if (!b) break;
            if (ev.delta?.type === 'text_delta') {
              b.text += ev.delta.text;
              yield { type: 'text', text: ev.delta.text };
            } else if (ev.delta?.type === 'input_json_delta') {
              b.json += ev.delta.partial_json ?? '';
            }
            break;
          }

          case 'content_block_stop': {
            const b = blocks.get(ev.index);
            if (b?.type === 'tool_use') {
              yield {
                type: 'tool_use',
                call: { type: 'tool_use', id: b.id!, name: b.name!, input: parseInput(b.json) },
              };
            }
            break;
          }

          case 'message_delta':
            stop = mapStop(ev.delta?.stop_reason) ?? stop;
            outputTokens = ev.usage?.output_tokens ?? outputTokens;
            break;

          case 'error':
            throw new AiProviderError(ev.error?.message ?? 'Stream xatosi', {
              retryable: ev.error?.type === 'overloaded_error',
            });
        }
      }

      const content: AiContentBlock[] = [...blocks.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, b]): AiContentBlock | null =>
          b.type === 'text'
            ? b.text
              ? { type: 'text', text: b.text }
              : null
            : { type: 'tool_use', id: b.id!, name: b.name!, input: parseInput(b.json) },
        )
        .filter((b): b is AiContentBlock => b !== null);

      yield {
        type: 'done',
        response: buildResponse(content, stop, { inputTokens, outputTokens }, usedModel),
      };
    } catch (e) {
      throw toProviderError(e);
    } finally {
      release();
    }
  }
}
