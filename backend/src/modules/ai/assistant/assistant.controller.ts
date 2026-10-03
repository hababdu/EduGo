// src/modules/ai/assistant/assistant.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { streamSse } from '../sse-response.util';
import { AssistantChatDto } from './assistant.dto';
import { AssistantActionService } from './assistant-action.service';
import { AssistantService } from './assistant.service';

/**
 * POST /api/v1/assistant/chat  (SSE)
 *   data: {"type":"text","delta":"..."}
 *   data: {"type":"tool_start","id":"...","name":"...","label":"..."}
 *   data: {"type":"tool_end","id":"...","name":"...","ok":true}
 *   data: {"type":"confirmation","action":{id,tool,summary,details:[{label,value}],risk,expiresAt}}   <- tasdiqlash kartochkasi
 *   data: {"type":"notice","message":"..."}
 *   data: [DONE]
 * Hamma rol foydalanadi; ko'rinadigan tool'lar va ma'lumotlar rolga qarab cheklanadi.
 */
@Controller('api/v1/assistant')
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly actions: AssistantActionService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('chat')
  async chat(@CurrentUser() user: CurrentUserPayload, @Body() dto: AssistantChatDto, @Res() res: Response) {
    await streamSse(res, this.assistant.chat(user, dto), (event) => event);
  }

  /* ── Yozuvchi amallar: model taklif qiladi, FAQAT foydalanuvchi shu endpointlar orqali tasdiqlaydi ── */

  /** Tasdiq kutayotgan kartochkalar (sahifa yangilangandan keyin tiklash uchun). */
  @Get('actions/pending')
  pending(@CurrentUser() user: CurrentUserPayload) {
    return this.actions.listPending(user);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('actions/:id/confirm')
  confirm(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.actions.confirm(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('actions/:id/cancel')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.actions.cancel(user, id);
  }
}
