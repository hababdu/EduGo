import { HttpException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('baza ishlasa ok', async () => {
    const c = new HealthController({ $queryRaw: jest.fn().mockResolvedValue([1]) } as any);
    expect(await c.check()).toMatchObject({ ok: true, db: true });
  });
  it('baza ishlamasa 503', async () => {
    const c = new HealthController({ $queryRaw: jest.fn().mockRejectedValue(new Error('x')) } as any);
    await expect(c.check()).rejects.toBeInstanceOf(HttpException);
  });
});
