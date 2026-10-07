// src/modules/ai/ai.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderName, AiTier } from './ai.types';

const PROVIDERS: AiProviderName[] = ['anthropic', 'groq', 'gemini'];

const DEFAULT_MODELS: Record<AiProviderName, Record<AiTier, string>> = {
  anthropic: { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-5-5' },
  // Hozirgi frontend ishlatib kelgan model (VITE_GROQ_MODEL standarti) bilan bir xil
  groq: { fast: 'openai/gpt-oss-20b', smart: 'openai/gpt-oss-20b' },
  gemini: { fast: 'gemini-2.5-flash-lite', smart: 'gemini-2.5-flash' },
};

// Kunlik token chegarasi (kirish + chiqish). 0 = cheklanmagan.
const DEFAULT_DAILY_LIMITS: Record<string, number> = {
  STUDENT: 30_000,
  TEACHER: 150_000,
  ADMIN: 300_000,
  SUPER_ADMIN: 0,
};

@Injectable()
export class AiConfig {
  constructor(private readonly cfg: ConfigService) {}

  private num(key: string, fallback: number): number {
    const raw = this.cfg.get<string>(key);
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Asosiy provayder (AI_PROVIDER). Noto'g'ri qiymat bo'lsa — anthropic. */
  get primary(): AiProviderName {
    const v = (this.cfg.get<string>('AI_PROVIDER') ?? 'anthropic').toLowerCase();
    return PROVIDERS.includes(v as AiProviderName) ? (v as AiProviderName) : 'anthropic';
  }

  /** Zaxira provayder (AI_FALLBACK_PROVIDER), asosiydan farq qilsagina. */
  get fallback(): AiProviderName | null {
    const v = (this.cfg.get<string>('AI_FALLBACK_PROVIDER') ?? '').toLowerCase();
    if (!PROVIDERS.includes(v as AiProviderName)) return null;
    return v === this.primary ? null : (v as AiProviderName);
  }

  model(provider: AiProviderName, tier: AiTier): string {
    const key = `${provider.toUpperCase()}_MODEL_${tier.toUpperCase()}`;
    return this.cfg.get<string>(key) || DEFAULT_MODELS[provider][tier];
  }

  dailyTokenLimit(role: string): number {
    const envVal = this.cfg.get<string>(`AI_DAILY_TOKENS_${role}`);
    if (envVal !== undefined && envVal !== '') {
      const n = Number(envVal);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return DEFAULT_DAILY_LIMITS[role] ?? DEFAULT_DAILY_LIMITS.STUDENT;
  }

  get timeoutMs(): number {
    return this.num('AI_TIMEOUT_MS', 60_000);
  }

  get streamTimeoutMs(): number {
    return this.num('AI_STREAM_TIMEOUT_MS', 120_000);
  }

  get defaultMaxTokens(): number {
    return this.num('AI_MAX_TOKENS', 1024);
  }

  /**
   * Test davomida student javobini AI bilan tekshirishi mumkinmi (AIAnswerCheck).
   * Standart: true (hozirgi xatti-harakat saqlanadi). Tutor/chat/tavsiya
   * test davomida HAR DOIM bloklanadi.
   */
  get allowGradeDuringTest(): boolean {
    return (this.cfg.get<string>('AI_ALLOW_GRADE_DURING_TEST') ?? 'true').toLowerCase() !== 'false';
  }

  /** "Kun" chegarasi hisoblanadigan vaqt zonasi siljishi (Toshkent = +5) */
  get tzOffsetHours(): number {
    return this.num('AI_TZ_OFFSET_HOURS', 5);
  }
}
