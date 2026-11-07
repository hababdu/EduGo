import { PanelService, tashkentNow } from './panel.service';

describe('tashkentNow', () => {
  it("UTC kechasi Toshkentda ertasi kun: yakshanba 20:00 UTC → dushanba 01:00", () => {
    expect(tashkentNow(new Date('2026-11-08T20:00:00Z'))).toEqual({ weekday: 1, time: '01:00' });
    expect(tashkentNow(new Date('2026-11-09T05:30:00Z'))).toEqual({ weekday: 1, time: '10:30' });
    expect(tashkentNow(new Date('2026-11-08T10:00:00Z')).weekday).toBe(7);
  });
});

describe('PanelService.context', () => {
  const mk = (slots: any[] = []) => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ali', lastName: null, organization: null }) },
      parentLink: { count: jest.fn().mockResolvedValue(2) },
      trialLesson: { count: jest.fn().mockResolvedValue(1) },
    };
    return new PanelService(prisma, { mine: jest.fn().mockResolvedValue([]) } as any, { mine: jest.fn().mockResolvedValue(slots) } as any);
  };
  it("maktabsiz o'quvchi: standalone va ochiq sinov darslari soni", async () => {
    const r: any = await mk().context({ id: 'u1', role: 'STUDENT' } as any);
    expect(r).toMatchObject({ standalone: true, openTrials: 1, organization: null, user: { name: 'Ali' } });
  });
  it("ota-ona: farzandlar soni; admin maktabsiz bo'lsa faqat asosiy ma'lumot", async () => {
    expect(await mk().context({ id: 'p1', role: 'PARENT' } as any)).toMatchObject({ children: 2 });
    expect(await mk().context({ id: 'a1', role: 'ADMIN', organizationId: null } as any)).not.toHaveProperty('pending');
  });
});
