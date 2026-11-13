import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export const EDUCATION_MODELS = [
  { key: 'SCHOOL_YEAR', label: 'Yillik maktab ta’limi' },
  { key: 'SEMESTER', label: 'Semestr tizimi' },
  { key: 'COURSE_BASED', label: 'Kurs va oqim asosida' },
  { key: 'SHORT_TERM', label: 'Qisqa muddatli kurs' },
  { key: 'APPOINTMENT', label: 'Individual mashg‘ulotlar' },
  { key: 'CLUB', label: 'To‘garak va klub' },
  { key: 'WORKSHOP', label: 'Trening va seminar' },
  { key: 'CUSTOM', label: 'Moslashtirilgan model' },
] as const;

export const EDUCATION_FEATURES = [
  { key: 'GROUPS', label: 'Guruhlar' },
  { key: 'COURSES', label: 'Kurslar va yo‘nalishlar' },
  { key: 'SUBJECTS', label: 'Fanlar' },
  { key: 'SCHEDULE', label: 'Dars jadvali' },
  { key: 'ACADEMIC_PERIODS', label: 'O‘quv davrlari' },
  { key: 'ATTENDANCE', label: 'Davomat' },
  { key: 'LESSONS', label: 'Darslar' },
  { key: 'MATERIALS', label: 'Materiallar' },
  { key: 'ASSIGNMENTS', label: 'Topshiriqlar' },
  { key: 'GRADING', label: 'Baholash' },
  { key: 'TESTS', label: 'Testlar va imtihonlar' },
  { key: 'PAYMENTS', label: 'To‘lovlar' },
  { key: 'CERTIFICATES', label: 'Sertifikatlar' },
  { key: 'ANALYTICS', label: 'Analitika' },
  { key: 'PARENT_ACCESS', label: 'Ota-ona kabineti' },
  { key: 'TRIAL_LESSONS', label: 'Sinov darslari' },
] as const;

export const EDUCATION_POLICIES = [
  { key: 'SCHEDULE', label: 'Jadval qoidalari' },
  { key: 'ATTENDANCE', label: 'Davomat qoidalari' },
  { key: 'GRADING', label: 'Baholash qoidalari' },
  { key: 'PAYMENT', label: 'To‘lov qoidalari' },
  { key: 'ASSIGNMENT', label: 'Topshiriq qoidalari' },
] as const;

@Injectable()
export class DynamicEducationService {
  constructor(private readonly prisma: PrismaService) {}

  private async organizationId(actor: CurrentUserPayload, requested?: string) {
    if (actor.role === 'SUPER_ADMIN' || actor.realRole === 'SUPER_ADMIN') {
      if (!requested) throw new BadRequestException('Super Admin uchun organizationId majburiy');
      const org = await this.prisma.organization.findUnique({ where: { id: requested }, select: { id: true } });
      if (!org) throw new NotFoundException('Tashkilot topilmadi');
      return org.id;
    }
    const activeId = actor.activeOrganizationId ?? actor.organizationId;
    if (!activeId || (requested && requested !== activeId)) throw new ForbiddenException('Faol tashkilot konteksti noto‘g‘ri');
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId: actor.id, organizationId: activeId, status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Ta’lim modelini faqat tashkilot administratori sozlaydi');
    return activeId;
  }

  async enabledFeatures(actor: CurrentUserPayload) {
    if (actor.role === 'SUPER_ADMIN' || actor.realRole === 'SUPER_ADMIN') {
      return { organizationId: null, features: EDUCATION_FEATURES.map((feature) => feature.key) };
    }
    const organizationId = actor.activeOrganizationId ?? actor.organizationId ?? null;
    if (!organizationId) return { organizationId: null, features: EDUCATION_FEATURES.map((feature) => feature.key) };
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId: actor.id, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Faol tashkilot a’zoligi topilmadi');
    const configs = await this.prisma.organizationModuleConfig.findMany({
      where: { organizationId }, select: { featureKey: true, enabled: true },
    });
    const disabled = new Set(configs.filter((item) => !item.enabled).map((item) => item.featureKey));
    return { organizationId, features: EDUCATION_FEATURES.filter((feature) => !disabled.has(feature.key)).map((feature) => feature.key) };
  }

  async catalog() {
    return { models: EDUCATION_MODELS, features: EDUCATION_FEATURES, policies: EDUCATION_POLICIES };
  }

  async getConfig(actor: CurrentUserPayload, requested?: string) {
    const organizationId = await this.organizationId(actor, requested);
    const [model, modules, policies, periods] = await Promise.all([
      this.prisma.organizationEducationModel.findUnique({ where: { organizationId } }),
      this.prisma.organizationModuleConfig.findMany({ where: { organizationId }, orderBy: { featureKey: 'asc' } }),
      this.prisma.organizationPolicy.findMany({ where: { organizationId }, orderBy: { policyKey: 'asc' } }),
      this.prisma.organizationAcademicPeriod.findMany({ where: { organizationId }, orderBy: { startsAt: 'desc' } }),
    ]);
    return { organizationId, model: model ?? { modelKey: 'CUSTOM', settings: {} }, modules, policies, periods };
  }

  async saveConfig(actor: CurrentUserPayload, input: {
    organizationId?: string; modelKey: string; settings?: Record<string, unknown>;
    modules?: { featureKey: string; enabled: boolean; settings?: Record<string, unknown> }[];
    policies?: { policyKey: string; config: Record<string, unknown> }[];
  }) {
    const organizationId = await this.organizationId(actor, input.organizationId);
    if (!EDUCATION_MODELS.some((m) => m.key === input.modelKey)) throw new BadRequestException('Ta’lim modeli noma’lum');
    const knownFeatures = new Set(EDUCATION_FEATURES.map((f) => f.key));
    const knownPolicies = new Set(EDUCATION_POLICIES.map((p) => p.key));
    if (input.modules?.some((m) => !knownFeatures.has(m.featureKey as any))) throw new BadRequestException('Noma’lum modul kaliti');
    if (input.policies?.some((p) => !knownPolicies.has(p.policyKey as any))) throw new BadRequestException('Noma’lum siyosat kaliti');
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationEducationModel.upsert({
        where: { organizationId },
        create: { organizationId, modelKey: input.modelKey, settings: (input.settings ?? {}) as any },
        update: { modelKey: input.modelKey, settings: (input.settings ?? {}) as any },
      });
      if (input.modules) {
        await tx.organizationModuleConfig.deleteMany({ where: { organizationId } });
        if (input.modules.length) await tx.organizationModuleConfig.createMany({
          data: input.modules.map((m) => ({ organizationId, featureKey: m.featureKey, enabled: m.enabled, settings: (m.settings ?? {}) as any })),
        });
      }
      if (input.policies) {
        await tx.organizationPolicy.deleteMany({ where: { organizationId } });
        if (input.policies.length) await tx.organizationPolicy.createMany({
          data: input.policies.map((p) => ({ organizationId, policyKey: p.policyKey, config: p.config as any })),
        });
      }
    });
    return this.getConfig(actor, organizationId);
  }

  private async handleActivePeriodConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Tashkilotda boshqa faol o‘quv davri mavjud. Avval uni yakunlang.');
      }
      throw error;
    }
  }

  async createPeriod(actor: CurrentUserPayload, input: {
    organizationId?: string; name: string; periodType?: string; startsAt: string; endsAt: string;
    isActive?: boolean; settings?: Record<string, unknown>;
  }) {
    const organizationId = await this.organizationId(actor, input.organizationId);
    const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt);
    if (!input.name?.trim() || Number.isNaN(+startsAt) || Number.isNaN(+endsAt) || endsAt <= startsAt) {
      throw new BadRequestException('Davr nomi va to‘g‘ri boshlanish/tugash sanalari talab qilinadi');
    }
    return this.handleActivePeriodConflict(() => this.prisma.$transaction(async (tx) => {
      if (input.isActive) await tx.organizationAcademicPeriod.updateMany({ where: { organizationId, isActive: true }, data: { isActive: false } });
      return tx.organizationAcademicPeriod.create({
        data: { organizationId, name: input.name.trim(), periodType: input.periodType ?? 'CUSTOM', startsAt, endsAt, isActive: input.isActive ?? false, settings: (input.settings ?? {}) as any },
      });
    }));
  }

  async updatePeriod(actor: CurrentUserPayload, id: string, input: {
    organizationId?: string; name?: string; periodType?: string; startsAt?: string; endsAt?: string;
    isActive?: boolean; settings?: Record<string, unknown>;
  }) {
    const organizationId = await this.organizationId(actor, input.organizationId);
    const current = await this.prisma.organizationAcademicPeriod.findFirst({ where: { id, organizationId } });
    if (!current) throw new NotFoundException('O‘quv davri topilmadi');
    const startsAt = input.startsAt ? new Date(input.startsAt) : current.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : current.endsAt;
    if (Number.isNaN(+startsAt) || Number.isNaN(+endsAt) || endsAt <= startsAt) throw new BadRequestException('Davr sanalari noto‘g‘ri');
    return this.handleActivePeriodConflict(() => this.prisma.$transaction(async (tx) => {
      if (input.isActive) await tx.organizationAcademicPeriod.updateMany({ where: { organizationId, isActive: true, id: { not: id } }, data: { isActive: false } });
      return tx.organizationAcademicPeriod.update({ where: { id }, data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.periodType !== undefined ? { periodType: input.periodType } : {}),
        startsAt, endsAt,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.settings !== undefined ? { settings: input.settings as any } : {}),
      } });
    }));
  }

  async deletePeriod(actor: CurrentUserPayload, id: string, requested?: string) {
    const organizationId = await this.organizationId(actor, requested);
    const result = await this.prisma.organizationAcademicPeriod.deleteMany({ where: { id, organizationId } });
    if (!result.count) throw new NotFoundException('O‘quv davri topilmadi');
    return { ok: true };
  }
}
