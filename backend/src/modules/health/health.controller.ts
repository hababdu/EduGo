import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/** Monitoring (UptimeRobot, Render health check): bazaga ulanishni tekshiradi. Sirli ma'lumot qaytarmaydi. */
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    const started = Date.now();
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
      ]);
    } catch {
      throw new HttpException({ ok: false, db: false }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { ok: true, db: true, dbMs: Date.now() - started, uptimeSec: Math.round(process.uptime()) };
  }
}
