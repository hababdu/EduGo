// src/modules/ai/ai.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from './ai.service';

@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Qaysi provayder faol, kalitlar sozlanganmi (kalitning o'zi HECH QACHON qaytarilmaydi). */
  @Roles('ADMIN')
  @Get('status')
  status() {
    return this.ai.status();
  }

  /** Kalit ishlayotganini tekshirish: juda kichik so'rov yuboradi (xarajat ~ 0). */
  @Roles('ADMIN')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('ping')
  async ping(@CurrentUser() user: CurrentUserPayload) {
    const started = Date.now();
    const res = await this.ai.complete(
      user,
      'ping',
      {
        messages: [{ role: 'user', content: "Faqat 'ok' deb javob ber." }],
        maxTokens: 16,
      },
      'fast',
    );
    return {
      ok: true,
      model: res.model,
      reply: res.text.trim(),
      usage: res.usage,
      ms: Date.now() - started,
    };
  }
}
