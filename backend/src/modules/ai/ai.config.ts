// src/modules/ai/ai.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderName, AiTier } from './ai.types';

export const PROVIDERS: AiProviderName[] = ['anthropic', 'groq', 'gemini'];

/** Super admin paneldan o'rnatiladigan qiymatlar. fallback: 'none' — zaxira yo'q. */
export interface AiOverrides {
  limits?: Record<string, number>;
  enabled?: boolean;
  primary?: AiProviderName;
  fallback?: AiProviderName | 'none';
  models?: Partial<Record<AiProviderName, Partial<Record<AiTier, string>>>>;
}

const DEFAULT_MODELS: Record<AiProviderName, Record<AiTier, string>> = {
  anthropic: { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-5-5' },
  // Hozirgi frontend ishlatib kelgan model (VITE_GROQ_MODEL standarti) bilan bir xil
  groq: { fast: 'openai/gpt-oss-20b', smart: 'openai/gpt-oss-20b' },
  // Google 2.5 modellarini yangi foydalanuvchilar uchun yopdi (404): hozirgi tavsiya etilgan model
  gemini: { fast: 'gemini-3.8-flash', smart: 'gemini-3.8-flash' },
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
  /** Super admin paneldan o'zgartiriladigan (bazada saqlanadigan) qiymatlar — env'dan ustun */
  private overrides: AiOverrides = {};

  constructor(private readonly cfg: ConfigService) {}

  applyOverrides(o: AiOverrides) {
    this.overrides = {
      limits: o.limits ?? {},
      enabled: o.enabled,
      primary: o.primary,
      fallback: o.fallback,
      models: o.models ?? {},
    };
  }

  /** AI umuman yoqilganmi (super admin o'chira oladi) */
  get enabled(): boolean {
    return this.overrides.enabled !== false;
  }

  private num(key: string, fallback: number): number {
    const raw = this.cfg.get<string>(key);
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Asosiy provayder: super admin tanlovi > AI_PROVIDER > gemini. */
  get primary(): AiProviderName {
    const ov = this.overrides.primary;
    if (ov && PROVIDERS.includes(ov)) return ov;
    const v = (this.cfg.get<string>('AI_PROVIDER') ?? 'gemini').toLowerCase();
    return PROVIDERS.includes(v as AiProviderName) ? (v as AiProviderName) : 'gemini';
  }

  /** Zaxira provayder: super admin tanlovi > AI_FALLBACK_PROVIDER; asosiydan farq qilsagina. */
  get fallback(): AiProviderName | null {
    const ov = this.overrides.fallback;
    if (ov === 'none') return null;
    const v = (ov ?? this.cfg.get<string>('AI_FALLBACK_PROVIDER') ?? '').toLowerCase();
    if (!PROVIDERS.includes(v as AiProviderName)) return null;
    return v === this.primary ? null : (v as AiProviderName);
  }

  /** Model: super admin tanlovi > env (<PROVAYDER>_MODEL_<FAST|SMART>) > standart. */
  model(provider: AiProviderName, tier: AiTier): string {
    const ov = this.overrides.models?.[provider]?.[tier];
    if (ov) return ov;
    const key = `${provider.toUpperCase()}_MODEL_${tier.toUpperCase()}`;
    return this.cfg.get<string>(key) || DEFAULT_MODELS[provider][tier];
  }

  /** Standart (hech narsa o'rnatilmagandagi) model — panelda "standart" sifatida ko'rsatish uchun */
  defaultModel(provider: AiProviderName, tier: AiTier): string {
    return DEFAULT_MODELS[provider][tier];
  }

  /** Super admin o'zgartirgan qiymatlar (env hisobga olinmagan) */
  get stored(): AiOverrides {
    return this.overrides;
  }

  dailyTokenLimit(role: string): number {
    const ov = this.overrides.limits?.[role];
    if (typeof ov === 'number' && Number.isFinite(ov) && ov >= 0) return ov;
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
