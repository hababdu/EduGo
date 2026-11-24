import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_FEATURES } from './features.catalog';

@Injectable()
export class FeaturesService implements OnModuleInit {
  private readonly logger = new Logger(FeaturesService.name);
  constructor(private readonly prisma: PrismaService, private readonly cfg: ConfigService) {}

  /** Katalogga yangi funksiyalarni qo'shadi (mavjudlarning narxiga tegmaydi). */
  async onModuleInit() {
    try {
      for (const f of DEFAULT_FEATURES) {
        await this.prisma.featureCatalog.upsert({
          where: { key: f.key },
          create: { key: f.key, name: f.name, description: f.description, icon: f.icon, priceMonthly: f.price, sortOrder: f.sortOrder },
          update: {},
        });
      }
    } catch (e) {
      this.logger.warn(`Funksiyalar katalogi yaratilmadi: ${(e as Error).message}`);
    }
  }

  /** Cheklov yoqilganmi? Default: yo'q — mavjud maktablar ishlashda davom etadi, narx esa hisoblanadi. */
  get enforced(): boolean { return this.cfg.get<string>('FEATURE_STORE_ENFORCE') === 'true'; }

  async monthlyTotal(orgId: string): Promise<number> {
    try {
      const r = await this.prisma.orgFeature.aggregate({ where: { organizationId: orgId }, _sum: { priceSnapshot: true } });
      return r._sum.priceSnapshot ?? 0;
    } catch (e) {
      // Jadval hali yaratilmagan bo'lsa ham obuna/hisob ishlashda davom etsin
      this.logger.warn(`Funksiyalar jami hisoblanmadi: ${(e as Error).message}`);
      return 0;
    }
  }

  async isEnabled(orgId: string | null | undefined, key: string): Promise<boolean> {
    if (!orgId) return false;
    return (await this.prisma.orgFeature.count({ where: { organizationId: orgId, featureKey: key } })) > 0;
  }

  /** ADMIN: do'kon (katalog + yoqilganlar + oylik jami). */
  async store(user: CurrentUserPayload) {
    if (!user.organizationId) throw new NotFoundException('Siz hech qaysi maktabga biriktirilmagansiz');
    const [catalog, mine, org] = await Promise.all([
      this.prisma.featureCatalog.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.orgFeature.findMany({ where: { organizationId: user.organizationId } }),
      this.prisma.organization.findUnique({ where: { id: user.organizationId }, select: { monthlyPlanFee: true } }),
    ]);
    const on = new Map(mine.map((m) => [m.featureKey, m]));
    const items = catalog
      .filter((c) => c.active || on.has(c.key))
      .map((c) => {
        const m = on.get(c.key);
        return { key: c.key, name: c.name, description: c.description, icon: c.icon, price: m ? m.priceSnapshot : c.priceMonthly, enabled: !!m, enabledAt: m?.enabledAt ?? null, available: c.active };
      });
    const featuresTotal = mine.reduce((a, m) => a + m.priceSnapshot, 0);
    const baseFee = org?.monthlyPlanFee ?? 0;
    return { items, baseFee, featuresTotal, total: baseFee + featuresTotal, enforced: this.enforced };
  }

  async enable(user: CurrentUserPayload, key: string) {
    if (!user.organizationId) throw new NotFoundException('Siz hech qaysi maktabga biriktirilmagansiz');
    const f = await this.prisma.featureCatalog.findUnique({ where: { key } });
    if (!f) throw new NotFoundException('Funksiya topilmadi');
    if (!f.active) throw new BadRequestException("Bu funksiya hozir sotuvda emas");
    await this.prisma.orgFeature.upsert({
      where: { organizationId_featureKey: { organizationId: user.organizationId, featureKey: key } },
      create: { organizationId: user.organizationId, featureKey: key, priceSnapshot: f.priceMonthly, enabledById: user.id },
      update: {},
    });
    await this.audit(user, 'FEATURE_ENABLE', key, null, { price: f.priceMonthly });
    return this.store(user);
  }

  async disable(user: CurrentUserPayload, key: string) {
    if (!user.organizationId) throw new NotFoundException('Siz hech qaysi maktabga biriktirilmagansiz');
    const old = await this.prisma.orgFeature.findUnique({ where: { organizationId_featureKey: { organizationId: user.organizationId, featureKey: key } } });
    if (!old) throw new NotFoundException('Funksiya yoqilmagan');
    await this.prisma.orgFeature.delete({ where: { id: old.id } });
    await this.audit(user, 'FEATURE_DISABLE', key, { price: old.priceSnapshot }, null);
    return this.store(user);
  }

  /** SUPER ADMIN: katalog (narx va sotuvdagi holat) */
  catalog() {
    return this.prisma.featureCatalog.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { orgs: true } } } })
      .then((rows) => rows.map((r) => ({ key: r.key, name: r.name, description: r.description, icon: r.icon, priceMonthly: r.priceMonthly, active: r.active, schools: r._count.orgs })));
  }

  async updateCatalog(actor: CurrentUserPayload, key: string, dto: { priceMonthly?: number; active?: boolean }) {
    const old = await this.prisma.featureCatalog.findUnique({ where: { key } });
    if (!old) throw new NotFoundException('Funksiya topilmadi');
    await this.prisma.featureCatalog.update({ where: { key }, data: { priceMonthly: dto.priceMonthly ?? undefined, active: dto.active ?? undefined } });
    await this.audit(actor, 'FEATURE_CATALOG', key, { price: old.priceMonthly, active: old.active }, { price: dto.priceMonthly ?? old.priceMonthly, active: dto.active ?? old.active });
    return { ok: true };
  }

  private audit(actor: CurrentUserPayload, action: string, key: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.adminActionLog.create({ data: { actorId: actor.id, action, targetType: 'Feature', targetId: key, oldValue: oldValue as any, newValue: newValue as any } }).catch(() => undefined);
  }
}
