import { NotFoundException } from '@nestjs/common';
import { AppLoginService } from './app-login.service';

describe('AppLoginService', () => {
  const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 'u', firstName: 'A', role: 'STUDENT' } };
  const make = () => {
    const auth: any = { loginTelegramUser: jest.fn().mockResolvedValue(tokens) };
    const config: any = { get: (k: string) => (k === 'BOT_USERNAME' ? '@edugo_bot' : undefined) };
    const rows = new Map<string, any>();
    const prisma: any = { appLoginSession: {
      create: async ({ data }: any) => { rows.set(data.id, { ...data }); },
      findUnique: async ({ where }: any) => rows.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => { const r = rows.get(where.id); if (!r || r.expiresAt <= where.expiresAt.gt) return { count: 0 }; Object.assign(r, data); return { count: 1 }; },
      deleteMany: async ({ where }: any) => { if (where.id) return { count: rows.delete(where.id) ? 1 : 0 }; return { count: 0 }; },
    } };
    return { svc: new AppLoginService(auth, config, prisma), auth };
  };
  const tg = { id: 5, first_name: 'Ali' };

  it('start → confirm → poll bir martalik token beradi', async () => {
    const { svc, auth } = make();
    const s = await svc.start();
    expect(s.url).toContain('edugo_bot?start=login_' + s.id);
    expect(await svc.poll(s.id, s.secret)).toEqual({ status: 'pending' });
    await svc.confirm(s.id, tg);
    const r: any = await svc.poll(s.id, s.secret);
    expect(r.status).toBe('ok');
    expect(r.accessToken).toBe('a');
    expect(auth.loginTelegramUser).toHaveBeenCalledWith(tg);
    await expect(svc.poll(s.id, s.secret)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("noto'g'ri secret bilan token bermaydi", async () => {
    const { svc } = make();
    const s = await svc.start();
    await svc.confirm(s.id, tg);
    await expect(svc.poll(s.id, 'x'.repeat(32))).rejects.toBeInstanceOf(NotFoundException);
  });

  it("noma'lum kodni tasdiqlab bo'lmaydi", async () => {
    const { svc } = make();
    await expect(svc.confirm('yoq', tg)).rejects.toBeInstanceOf(NotFoundException);
  });
});
