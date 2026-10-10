// src/modules/ai/providers/groq.provider.ts
//
// Groq (OpenAI-mos /chat/completions). GROQ_BASE_URL orqali istalgan
// OpenAI-mos xizmatga (OpenRouter, Together va h.k.) ham ulash mumkin.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../ai.config';
import { estimateTokens } from '../ai.util';
import {
  AiContentBlock,
  AiProvider,
  AiProviderName,
  AiRequest,
  AiResponse,
  AiStopReason,
  AiStreamEvent,
  AiToolUseBlock,
} from '../ai.types';
import { postJson, toProviderError } from '../http.util';
import { parseSse } from '../sse.util';

/** Umumiy so'rovni OpenAI-mos "messages" massiviga o'giradi (sof funksiya). */
export function toOpenAiMessages(req: AiRequest) {
  const out: any[] = [];
  if (req.system) out.push({ role: 'system', content: req.system });

  for (const m of req.messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content });
      continue;
    }

    if (m.role === 'assistant') {
      const text = m.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const calls = m.content
        .filter((b): b is AiToolUseBlock => b.type === 'tool_use')
        .map((b) => ({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        }));
      out.push({
        role: 'assistant',
        content: text || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
    } else {
      // tool_result'lar alohida 'tool' xabarlari bo'ladi; ular assistant tool_calls'idan keyin darhol kelishi kerak
      for (const b of m.content) {
        if (b.type === 'tool_result') {
          out.push({ role: 'tool', tool_call_id: b.toolUseId, content: b.content });
        }
      }
      const text = m.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      if (text) out.push({ role: 'user', content: text });
    }
  }
  return out;
}

function mapFinish(reason?: string): AiStopReason {
  switch (reason) {
    case 'stop':
      return 'end';
    case 'tool_calls':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    default:
      return 'other';
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

/** OpenAI-mos /chat/completions provayderlari uchun umumiy asos (Groq, Gemini). */
export abstract class OpenAiCompatProvider implements AiProvider {
  abstract readonly name: AiProviderName;

  constructor(
    protected readonly env: ConfigService,
    protected readonly cfg: AiConfig,
    private readonly keyVar: string,
    private readonly baseUrlVar: string,
    private readonly defaultBase: string,
  ) {}

  isConfigured(): boolean {
    return !!this.env.get<string>(this.keyVar);
  }

  private url(): string {
    const base = this.env.get<string>(this.baseUrlVar) || this.defaultBase;
    return `${base.replace(/\/+$/, '')}/chat/completions`;
  }

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.env.get<string>(this.keyVar) ?? ''}` };
  }

  private maxTokensFor(req: AiRequest, model: string): number {
    const base = req.maxTokens ?? this.cfg.defaultMaxTokens;
    return /gpt-oss/i.test(model) ? Math.max(base * 2, 4096) : base;
  }

  private body(req: AiRequest, model: string, stream: boolean) {
    return {
      model,
      // gpt-oss kabi reasoning modellarda "o'ylash" tokenlari ham limitga kiradi — JSON qirqilib qolmasin
      max_tokens: this.maxTokensFor(req, model),
      ...(/gpt-oss/i.test(model) ? { reasoning_effort: 'low' } : {}),
      messages: toOpenAiMessages(req),
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
          }
        : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.json && !req.tools?.length ? { response_format: { type: 'json_object' } } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  private finish(
    text: string,
    calls: AiToolUseBlock[],
    finishReason: string | undefined,
    usage: { inputTokens: number; outputTokens: number },
    model: string,
  ): AiResponse {
    const content: AiContentBlock[] = [];
    if (text) content.push({ type: 'text', text });
    content.push(...calls);
    return {
      text,
      content,
      toolCalls: calls,
      stopReason: calls.length ? 'tool_use' : mapFinish(finishReason),
      usage,
      model,
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
      const choice = data.choices?.[0];
      const msg = choice?.message ?? {};
      const calls: AiToolUseBlock[] = (msg.tool_calls ?? []).map((tc: any, i: number) => ({
        type: 'tool_use',
        id: tc.id || `call_${i}`,
        name: tc.function?.name,
        input: safeParse(tc.function?.arguments ?? ''),
      }));
      const text: string = msg.content ?? '';
      return this.finish(
        text,
        calls,
        choice?.finish_reason,
        {
          inputTokens: data.usage?.prompt_tokens ?? estimateTokens(this.body(req, model, false).messages),
          outputTokens: data.usage?.completion_tokens ?? estimateTokens(text),
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
    const body = this.body(req, model, true);
    const { res, release } = await postJson(
      this.url(),
      this.headers(),
      body,
      this.cfg.streamTimeoutMs,
    );

    let text = '';
    let finishReason: string | undefined;
    let usage: { inputTokens: number; outputTokens: number } | null = null;
    const calls = new Map<number, { id: string; name: string; args: string }>();

    try {
      for await (const msg of parseSse(res.body)) {
        if (msg.data === '[DONE]') break;
        let ev: any;
        try {
          ev = JSON.parse(msg.data);
        } catch {
          continue;
        }

        const u = ev.usage ?? ev.x_groq?.usage;
        if (u) {
          usage = { inputTokens: u.prompt_tokens ?? 0, outputTokens: u.completion_tokens ?? 0 };
        }

        const choice = ev.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};

        if (delta.content) {
          text += delta.content;
          yield { type: 'text', text: delta.content };
        }

        for (const tc of delta.tool_calls ?? []) {
          let i = tc.index ?? 0;
          // Ba'zi provayderlar (Gemini) parallel chaqiruvlarni bir xil index bilan yuboradi:
          // OpenAI'da nom faqat chaqiruvning birinchi bo'lagida keladi, shuning uchun
          // band slotda yangi nom/id kelsa — bu yangi chaqiruv.
          const existing = calls.get(i);
          if (existing && ((tc.function?.name && existing.name) || (tc.id && existing.id && tc.id !== existing.id))) {
            i = Math.max(...calls.keys()) + 1;
          }
          const cur = calls.get(i) ?? { id: '', name: '', args: '' };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          calls.set(i, cur);
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      // Tool argumentlari stream oxirida to'liq bo'ladi
      const toolCalls: AiToolUseBlock[] = [...calls.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([i, c]) => ({
          type: 'tool_use' as const,
          id: c.id || `call_${i}`,
          name: c.name,
          input: safeParse(c.args),
        }));
      for (const call of toolCalls) yield { type: 'tool_use', call };

      yield {
        type: 'done',
        response: this.finish(
          text,
          toolCalls,
          finishReason,
          usage ?? {
            inputTokens: estimateTokens(body.messages),
            outputTokens: estimateTokens(text),
          },
          model,
        ),
      };
    } catch (e) {
      throw toProviderError(e);
    } finally {
      release();
    }
  }
}

@Injectable()
export class GroqProvider extends OpenAiCompatProvider {
  readonly name = 'groq' as const;

  constructor(env: ConfigService, cfg: AiConfig) {
    super(env, cfg, 'GROQ_API_KEY', 'GROQ_BASE_URL', 'https://api.groq.com/openai/v1');
  }
}
