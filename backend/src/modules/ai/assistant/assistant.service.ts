// src/modules/ai/assistant/assistant.service.ts
//
// Yordamchining asosiy sikli:  model -> (tool so'rasa) -> tool'ni BIZ bajaramiz -> natija modelga -> ... -> javob.
// Model hech narsani o'zi bajarmaydi: u faqat tool so'raydi, ruxsatni esa registry + mavjud servislar hal qiladi.
import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AiService } from '../ai.service';
import { AiMessage, AiResponse, AiToolResultBlock } from '../ai.types';
import { AiAccessService } from '../features/ai-access.service';
import { normalizeHistory } from '../features/ai-prompts';
import { AssistantChatDto } from './assistant.dto';
import { AssistantEvent, effectiveRole } from './assistant.types';
import { AssistantActionService } from './assistant-action.service';
import { AssistantToolRegistry } from './assistant-tool.registry';
import { buildAssistantSystemPrompt } from './assistant-prompt';

export const MAX_STEPS = 6; // model <-> tool aylanishlari soni chegarasi (cheksiz sikl va xarajatdan himoya)
export const MAX_TOOL_CALLS_PER_STEP = 4;
export const MAX_PROPOSALS_PER_CHAT = 3; // bir suhbatda ko'pi bilan shuncha amal taklif qilinadi

@Injectable()
export class AssistantService {
  constructor(
    private readonly ai: AiService,
    private readonly registry: AssistantToolRegistry,
    private readonly access: AiAccessService,
    private readonly actions: AssistantActionService,
  ) {}

  async *chat(user: CurrentUserPayload, dto: AssistantChatDto): AsyncGenerator<AssistantEvent> {
    await this.access.assertAllowed(user); // student test paytida yordamchidan foydalana olmaydi
    const messages: AiMessage[] = normalizeHistory(dto.history);
    const name = await this.access.displayName(user.id);
    const tools = this.registry.definitionsFor(user);
    const system = buildAssistantSystemPrompt({ role: effectiveRole(user.role), name, page: dto.page });

    let emittedText = false;
    let proposals = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      let final: AiResponse | undefined;
      let stepHasText = false;

      for await (const ev of this.ai.stream(user, 'assistant', { system, messages, tools, temperature: 0.3, maxTokens: 1200 }, 'smart')) {
        if (ev.type === 'text') {
          // Tool'dan oldingi va keyingi matn yopishib qolmasin
          if (!stepHasText && emittedText) yield { type: 'text', delta: '\n\n' };
          stepHasText = true;
          emittedText = true;
          yield { type: 'text', delta: ev.text };
        } else if (ev.type === 'done') {
          final = ev.response;
        }
      }
      if (!final) return;

      messages.push({ role: 'assistant', content: final.content });

      if (!final.toolCalls.length) {
        if (!emittedText) yield { type: 'notice', message: "AI javob bermadi. Savolni boshqacha yozib ko'ring." };
        else if (final.stopReason === 'max_tokens') yield { type: 'notice', message: 'Javob uzunlik chegarasiga yetdi. "Davom et" deb yozing.' };
        return;
      }

      // HAR BIR tool_use ga natija BO'LISHI SHART (aks holda provayder keyingi so'rovni rad etadi)
      const results: AiToolResultBlock[] = [];
      for (const [i, call] of final.toolCalls.entries()) {
        if (i >= MAX_TOOL_CALLS_PER_STEP) {
          results.push({ type: 'tool_result', toolUseId: call.id, isError: true, content: JSON.stringify({ error: "Bir vaqtda juda ko'p tool so'raldi; kerak bo'lsa keyingi qadamda so'ra" }) });
          continue;
        }
        yield { type: 'tool_start', id: call.id, name: call.name, label: this.registry.label(user, call.name) };

        // YOZUVCHI tool: bajarilmaydi — taklif yaratiladi va foydalanuvchiga tasdiqlash kartochkasi yuboriladi
        const write = this.registry.writeToolByName(user, call.name);
        if (write) {
          if (proposals >= MAX_PROPOSALS_PER_CHAT) {
            yield { type: 'tool_end', id: call.id, name: call.name, ok: false };
            results.push({ type: 'tool_result', toolUseId: call.id, isError: true, content: JSON.stringify({ error: `Bir suhbatda ko'pi bilan ${MAX_PROPOSALS_PER_CHAT} ta amal taklif qilish mumkin` }) });
            continue;
          }
          proposals++;
          const proposed = await this.actions.propose(user, write, call.input);
          yield { type: 'tool_end', id: call.id, name: call.name, ok: proposed.ok };
          if (proposed.card) yield { type: 'confirmation', action: proposed.card };
          results.push({ type: 'tool_result', toolUseId: call.id, content: proposed.content, ...(proposed.ok ? {} : { isError: true }) });
          continue;
        }

        const outcome = await this.registry.execute(user, call.name, call.input);
        yield { type: 'tool_end', id: call.id, name: call.name, ok: outcome.ok };
        results.push({ type: 'tool_result', toolUseId: call.id, content: outcome.content, ...(outcome.ok ? {} : { isError: true }) });
      }
      messages.push({ role: 'user', content: results });
    }

    yield { type: 'notice', message: "So'rov juda murakkab bo'lib ketdi. Savolni soddaroq qilib qayta yozing." };
  }
}
