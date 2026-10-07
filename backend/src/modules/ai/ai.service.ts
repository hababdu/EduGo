// src/modules/ai/ai.service.ts
//
// Loyihaning qolgan qismi AI bilan FAQAT shu servis orqali gaplashadi.
// Provayder tanlash, zaxira provayderga o'tish, kunlik limit va xarajat
// hisobi shu yerda.
import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AiConfig } from './ai.config';
import { AiUsageService } from './ai-usage.service';
import { estimateTokens, extractJson } from './ai.util';
import {
  AiProvider,
  AiProviderError,
  AiProviderName,
  AiRequest,
  AiResponse,
  AiStreamEvent,
  AiTier,
} from './ai.types';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Record<AiProviderName, AiProvider>;

  constructor(
    private readonly cfg: AiConfig,
    private readonly usage: AiUsageService,
    anthropic: AnthropicProvider,
    groq: GroqProvider,
    gemini: GeminiProvider,
  ) {
    this.providers = { anthropic, groq, gemini };
  }

  /** Sozlangan provayderlar, urinish tartibida: [asosiy, zaxira]. */
  providerChain(): AiProvider[] {
    const names: AiProviderName[] = [this.cfg.primary];
    if (this.cfg.fallback) names.push(this.cfg.fallback);
    return names.map((n) => this.providers[n]).filter((p) => p.isConfigured());
  }

  status() {
    return {
      primary: this.cfg.primary,
      fallback: this.cfg.fallback,
      configured: {
        anthropic: this.providers.anthropic.isConfigured(),
        groq: this.providers.groq.isConfigured(),
        gemini: this.providers.gemini.isConfigured(),
      },
      models: {
        anthropic: {
          fast: this.cfg.model('anthropic', 'fast'),
          smart: this.cfg.model('anthropic', 'smart'),
        },
        groq: {
          fast: this.cfg.model('groq', 'fast'),
          smart: this.cfg.model('groq', 'smart'),
        },
        gemini: {
          fast: this.cfg.model('gemini', 'fast'),
          smart: this.cfg.model('gemini', 'smart'),
        },
      },
      active: this.providerChain().map((p) => p.name),
    };
  }

  async complete(
    user: CurrentUserPayload,
    feature: string,
    req: AiRequest,
    tier: AiTier = 'fast',
  ): Promise<AiResponse> {
    await this.usage.assertQuota(user);
    const chain = this.requireChain();

    let lastError: unknown;
    for (const provider of chain) {
      const model = this.cfg.model(provider.name, tier);
      try {
        const res = await provider.complete(req, model);
        await this.usage.record(user.id, feature, provider.name, res.model, res.usage);
        return res;
      } catch (e) {
        lastError = e;
        if (!this.canFallback(e)) break;
        this.logger.warn(`${provider.name} ishlamadi (${(e as Error).message}), zaxiraga o'tilmoqda`);
      }
    }
    throw this.toHttp(lastError);
  }

  /**
   * Stream. Zaxira provayderga faqat HECH NARSA yuborilmasdan oldin o'tiladi
   * (foydalanuvchi yarim javobni ko'rib bo'lgan bo'lsa, qayta boshlab bo'lmaydi).
   */
  async *stream(
    user: CurrentUserPayload,
    feature: string,
    req: AiRequest,
    tier: AiTier = 'smart',
  ): AsyncGenerator<AiStreamEvent> {
    await this.usage.assertQuota(user);
    const chain = this.requireChain();

    let lastError: unknown;
    for (const provider of chain) {
      const model = this.cfg.model(provider.name, tier);
      let started = false;
      let recorded = false;
      let outChars = 0;
      try {
        for await (const ev of provider.stream(req, model)) {
          started = true;
          if (ev.type === 'text') outChars += ev.text.length;
          if (ev.type === 'done') {
            recorded = true;
            await this.usage.record(user.id, feature, provider.name, ev.response.model, ev.response.usage);
          }
          yield ev;
        }
        return;
      } catch (e) {
        lastError = e;
        if (started || !this.canFallback(e)) break;
        this.logger.warn(`${provider.name} stream ishlamadi (${(e as Error).message}), zaxiraga o'tilmoqda`);
      } finally {
        // Foydalanuvchi stream'ni to'xtatsa yoki ulanish uzilsa ham, sarflangan tokenlar limitga hisoblanadi
        if (started && !recorded) {
          await this.usage.record(user.id, feature, provider.name, model, {
            inputTokens: estimateTokens(req),
            outputTokens: Math.ceil(outChars / 4),
          });
        }
      }
    }
    throw this.toHttp(lastError);
  }

  /** Modeldan JSON kutiladigan vazifalar uchun (savol generatsiyasi va h.k.). */
  async completeJson<T = unknown>(
    user: CurrentUserPayload,
    feature: string,
    req: AiRequest,
    tier: AiTier = 'fast',
  ): Promise<T> {
    const system = [
      req.system,
      'MUHIM: javobni faqat bitta yaroqli JSON sifatida qaytar. Markdown, izoh yoki qo\'shimcha matn yozma.',
    ]
      .filter(Boolean)
      .join('\n\n');
    const res = await this.complete(user, feature, { ...req, system, json: true }, tier);
    return extractJson<T>(res.text);
  }

  private requireChain(): AiProvider[] {
    const chain = this.providerChain();
    if (!chain.length) {
      throw new ServiceUnavailableException('AI xizmati sozlanmagan');
    }
    return chain;
  }

  private canFallback(e: unknown): boolean {
    return e instanceof AiProviderError && e.retryable;
  }

  /** Provayder xatolarini foydalanuvchiga xavfsiz (sirsiz) HTTP xatoga aylantiradi. */
  private toHttp(e: unknown): HttpException {
    if (e instanceof HttpException) return e;

    if (e instanceof AiProviderError) {
      this.logger.error(`AI provayder xatosi [${e.status ?? '-'}]: ${e.message}`);
      if (e.timeout) return new GatewayTimeoutException("AI o'z vaqtida javob bermadi");
      if (e.status === 429) {
        return new HttpException(
          "AI hozir band, birozdan keyin qayta urinib ko'ring",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (e.status === 401 || e.status === 403) {
        return new BadGatewayException('AI xizmati sozlamasida xatolik (kalit yoki ruxsat)');
      }
      return new BadGatewayException('AI xizmati vaqtincha ishlamayapti');
    }

    this.logger.error(`AI kutilmagan xato: ${(e as Error)?.message}`);
    return new BadGatewayException('AI xizmati vaqtincha ishlamayapti');
  }
}
