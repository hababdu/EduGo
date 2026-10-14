import { NotFoundException } from '@nestjs/common';
import { AppLoginService } from './app-login.service';

describe('AppLoginService', () => {
  const tokens = { accessToken: 'a', refreshToken: 'r', user: { id: 'u', firstName: 'A', role: 'STUDENT' } };
  const make = () => {
    const auth: any = { loginTelegramUser: jest.fn().mockResolvedValue(tokens) };
    const config: any = { get: (k: string) => (k === 'BOT_USERNAME' ? '@edugo_bot' : undefined) };
    return { svc: new AppLoginService(auth, config), auth };
  };
  const tg = { id: 5, first_name: 'Ali' };

  it('start → confirm → poll bir martalik token beradi', async () => {
    const { svc, auth } = make();
    const s = await svc.start();
    expect(s.url).toContain('edugo_bot?start=login_' + s.id);
    expect(await svc.poll(s.id, s.secret)).toEqual({ status: 'pending' });
    svc.confirm(s.id, tg);
    const r: any = await svc.poll(s.id, s.secret);
    expect(r.status).toBe('ok');
    expect(r.accessToken).toBe('a');
    expect(auth.loginTelegramUser).toHaveBeenCalledWith(tg);
    await expect(svc.poll(s.id, s.secret)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("noto'g'ri secret bilan token bermaydi", async () => {
    const { svc } = make();
    const s = await svc.start();
    svc.confirm(s.id, tg);
    await expect(svc.poll(s.id, 'x'.repeat(32))).rejects.toBeInstanceOf(NotFoundException);
  });

  it("noma'lum kodni tasdiqlab bo'lmaydi", () => {
    const { svc } = make();
    expect(() => svc.confirm('yoq', tg)).toThrow(NotFoundException);
  });
});
