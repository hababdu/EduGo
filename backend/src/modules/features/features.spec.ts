import { ForbiddenException } from '@nestjs/common';
import { FeatureGuard } from './feature.guard';
import { FeaturesService } from './features.service';

const admin = { id: 'a1', role: 'ADMIN', organizationId: 'o1' } as any;

function mk(opts: { enforce?: boolean; enabled?: { featureKey: string; priceSnapshot: number }[]; fee?: number } = {}) {
  const enabled = opts.enabled ?? [];
  const catalog = [
    { key: 'trials', name: 'Sinov', description: 'd', icon: 'i', priceMonthly: 40000, active: true, sortOrder: 1 },
    { key: 'leads', name: 'Lidlar', description: 'd', icon: 'i', priceMonthly: 30000, active: true, sortOrder: 2 },
    { key: 'old', name: 'Eski', description: 'd', icon: 'i', priceMonthly: 10000, active: false, sortOrder: 3 },
  ];
  const prisma: any = {
    featureCatalog: { findMany: jest.fn().mockResolvedValue(catalog), findUnique: jest.fn(({ where }: any) => Promise.resolve(catalog.find((c) => c.key === where.key) ?? null)), upsert: jest.fn(), update: jest.fn() },
    orgFeature: {
      findMany: jest.fn().mockResolvedValue(enabled), count: jest.fn(({ where }: any) => Promise.resolve(enabled.filter((e) => e.featureKey === where.featureKey).length)),
      aggregate: jest.fn().mockResolvedValue({ _sum: { priceSnapshot: enabled.reduce((a, e) => a + e.priceSnapshot, 0) } }),
      upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(enabled[0] ? { id: 'x', ...enabled[0] } : null), delete: jest.fn().mockResolvedValue({}),
    },
    organization: { findUnique: jest.fn().mockResolvedValue({ monthlyPlanFee: opts.fee ?? 500000 }) },
    adminActionLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const cfg: any = { get: () => (opts.enforce ? 'true' : undefined) };
  return { svc: new FeaturesService(prisma, cfg), prisma };
}

describe('FeaturesService', () => {
  it("do'kon: tarif + yoqilgan funksiyalar = oylik jami; sotuvda bo'lmagan va yoqilmaganlar ko'rinmaydi", async () => {
    const { svc } = mk({ enabled: [{ featureKey: 'trials', priceSnapshot: 35000 }] });
    const r = await svc.store(admin);
    expect(r.baseFee).toBe(500000);
    expect(r.featuresTotal).toBe(35000);
    expect(r.total).toBe(535000);
    expect(r.items.map((i) => i.key)).toEqual(['trials', 'leads']);
    expect(r.items[0]).toMatchObject({ enabled: true, price: 35000 }); // yoqilgan paytdagi narx saqlanadi
    expect(r.items[1]).toMatchObject({ enabled: false, price: 30000 });
  });

  it("yoqish: joriy narx snapshot sifatida yoziladi; sotuvda bo'lmagan funksiyani yoqib bo'lmaydi", async () => {
    const { svc, prisma } = mk();
    await svc.enable(admin, 'leads');
    expect(prisma.orgFeature.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ priceSnapshot: 30000, organizationId: 'o1', featureKey: 'leads' }) }));
    await expect(svc.enable(admin, 'old')).rejects.toThrow("sotuvda emas");
    await expect(svc.enable(admin, 'yoq')).rejects.toThrow('topilmadi');
  });

  it("o'chirish: yoqilmagan funksiya 404", async () => {
    const { svc } = mk();
    await expect(svc.disable(admin, 'leads')).rejects.toThrow('yoqilmagan');
  });

  it("maktabsiz admin uchun xato", async () => {
    const { svc } = mk();
    await expect(svc.store({ ...admin, organizationId: null })).rejects.toThrow('biriktirilmagansiz');
  });
});

describe('FeatureGuard', () => {
  const ctx = (user: any) => ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;
  const reflector = (key?: string) => ({ getAllAndOverride: () => key }) as any;

  it("cheklov o'chiq bo'lsa (default) hammaga ruxsat", async () => {
    const { svc } = mk({ enforce: false });
    expect(await new FeatureGuard(reflector('trials'), svc).canActivate(ctx(admin))).toBe(true);
  });
  it("cheklov yoqilganda: yoqilmagan funksiya 403, yoqilgan — ruxsat, super admin — ruxsat (view rejimida ham)", async () => {
    const off = mk({ enforce: true });
    await expect(new FeatureGuard(reflector('trials'), off.svc).canActivate(ctx(admin))).rejects.toBeInstanceOf(ForbiddenException);
    const on = mk({ enforce: true, enabled: [{ featureKey: 'trials', priceSnapshot: 1 }] });
    expect(await new FeatureGuard(reflector('trials'), on.svc).canActivate(ctx(admin))).toBe(true);
    expect(await new FeatureGuard(reflector('trials'), off.svc).canActivate(ctx({ role: 'ADMIN', realRole: 'SUPER_ADMIN' }))).toBe(true);
  });
  it("kalit belgilanmagan joyga tegmaydi", async () => {
    const { svc } = mk({ enforce: true });
    expect(await new FeatureGuard(reflector(undefined), svc).canActivate(ctx(admin))).toBe(true);
  });
});
