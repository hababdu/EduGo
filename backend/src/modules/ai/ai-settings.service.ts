import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from './ai.config';

export const AI_SETTING_KEY = 'ai';
export const LIMIT_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

export interface AiSettings {
  enabled: boolean;
  limits: Record<string, number>;
}

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
      if (row) this.cfg.applyOverrides(row.value as any);
    } catch (e) {
      this.log.warn(`AI sozlamalarini yuklab bo'lmadi: ${(e as Error).message}`);
    }
  }

  current(): AiSettings {
    const limits: Record<string, number> = {};
    for (const r of LIMIT_ROLES) limits[r] = this.cfg.dailyTokenLimit(r);
    return { enabled: this.cfg.enabled, limits };
  }

  async save(patch: { enabled?: boolean; limits?: Record<string, number> }): Promise<AiSettings> {
    const cur = this.current();
    const next = {
      enabled: patch.enabled ?? cur.enabled,
      limits: { ...cur.limits, ...(patch.limits ?? {}) },
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
