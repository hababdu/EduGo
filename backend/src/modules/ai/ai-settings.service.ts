import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig, AiOverrides, PROVIDERS } from './ai.config';
import { AiProviderName, AiTier } from './ai.types';

export const AI_SETTING_KEY = 'ai';
export const LIMIT_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

export interface AiSettings {
  enabled: boolean;
  limits: Record<string, number>;
  primary: AiProviderName;
  fallback: AiProviderName | null;
  models: Record<AiProviderName, Record<AiTier, string>>;
}

export interface AiSettingsPatch {
  enabled?: boolean;
  limits?: Record<string, number>;
  primary?: AiProviderName;
  /** 'none' — zaxirasiz */
  fallback?: AiProviderName | 'none';
  /** Bo'sh matn — standart modelga qaytarish */
  models?: Partial<Record<AiProviderName, Partial<Record<AiTier, string>>>>;
}

/** Model nomi: harf, raqam va . _ - / : belgilari, 80 tagacha */
export const MODEL_NAME_RE = /^[A-Za-z0-9._\-\/:]{1,80}$/;

/** Super admin sozlagan AI parametrlari: bazada (AppSetting) saqlanadi, ishga tushganda AiConfig'ga yuklanadi. */
@Injectable()
export class AiSettingsService implements OnModuleInit {
  private readonly log = new Logger(AiSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: AiConfig,
  ) {}

  async onModuleInit() {
    try {
      const row = await this.prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEY } });
      const stored = (row?.value ?? {}) as AiOverrides;
      this.cfg.applyOverrides(stored);
      // Bir martalik: asosiy AI hali tanlanmagan bo'lsa — Gemini (keyin super admin o'zgartira oladi)
      if (!stored.primary) await this.save({ primary: 'gemini' });
    } catch (e) {
      this.log.warn(`AI sozlamalarini yuklab bo'lmadi: ${(e as Error).message}`);
    }
  }

  current(): AiSettings {
    const limits: Record<string, number> = {};
    for (const r of LIMIT_ROLES) limits[r] = this.cfg.dailyTokenLimit(r);
    const models = {} as AiSettings['models'];
    for (const p of PROVIDERS) models[p] = { fast: this.cfg.model(p, 'fast'), smart: this.cfg.model(p, 'smart') };
    return { enabled: this.cfg.enabled, limits, primary: this.cfg.primary, fallback: this.cfg.fallback, models };
  }

  async save(patch: AiSettingsPatch): Promise<AiSettings> {
    const cur = this.cfg.stored;
    const models: NonNullable<AiOverrides['models']> = {};
    for (const p of PROVIDERS) models[p] = { ...(cur.models?.[p] ?? {}) };
    for (const p of PROVIDERS) {
      for (const tier of ['fast', 'smart'] as AiTier[]) {
        const v = patch.models?.[p]?.[tier];
        if (v === undefined) continue;
        const name = v.trim();
        if (name === '') delete models[p]![tier];
        else if (MODEL_NAME_RE.test(name)) models[p]![tier] = name;
        else throw new BadRequestException(`Model nomi noto'g'ri: ${name}`);
      }
    }
    const next: AiOverrides = {
      enabled: patch.enabled ?? this.cfg.enabled,
      limits: { ...(cur.limits ?? {}), ...(patch.limits ?? {}) },
      primary: patch.primary ?? cur.primary,
      fallback: patch.fallback ?? cur.fallback,
      models,
    };
    await this.prisma.appSetting.upsert({
      where: { key: AI_SETTING_KEY },
      create: { key: AI_SETTING_KEY, value: next as any },
      update: { value: next as any },
    });
    this.cfg.applyOverrides(next);
    return this.current();
  }
}
