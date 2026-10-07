// src/modules/ai/features/ai-features.controller.ts
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ChatDto,
  GenerateMaterialDto,
  GenerateQuestionsDto,
  GenerateSingleQuestionDto,
  GradeAnswerDto,
  LessonPlanDto,
  MascotDto,
  ParentMessageDto,
  RecommendationsDto,
  TutorChatDto,
} from './ai-features.dto';
import { AiFeaturesService } from './ai-features.service';
import { streamSse } from '../sse-response.util';

const GEN = { default: { limit: 10, ttl: 60_000 } };
const CHAT = { default: { limit: 20, ttl: 60_000 } };
const LIGHT = { default: { limit: 6, ttl: 60_000 } };

@Controller('api/v1/ai')
export class AiFeaturesController {
  constructor(private readonly features: AiFeaturesService) {}

  /* ── O'qituvchi / admin ── */

  @Roles('TEACHER', 'ADMIN') @Throttle(GEN) @Post('material')
  material(@CurrentUser() u: CurrentUserPayload, @Body() dto: GenerateMaterialDto) {
    return this.features.material(u, dto);
  }

  @Roles('TEACHER', 'ADMIN') @Throttle(GEN) @Post('questions')
  questions(@CurrentUser() u: CurrentUserPayload, @Body() dto: GenerateQuestionsDto) {
    return this.features.questions(u, dto);
  }

  @Roles('TEACHER', 'ADMIN') @Throttle(GEN) @Post('question')
  question(@CurrentUser() u: CurrentUserPayload, @Body() dto: GenerateSingleQuestionDto) {
    return this.features.singleQuestion(u, dto);
  }

  @Roles('TEACHER', 'ADMIN') @Throttle(GEN) @Post('lesson-plan')
  lessonPlan(@CurrentUser() u: CurrentUserPayload, @Body() dto: LessonPlanDto) {
    return this.features.lessonPlan(u, dto);
  }

  @Roles('TEACHER', 'ADMIN') @Throttle(GEN) @Post('parent-message')
  parentMessage(@CurrentUser() u: CurrentUserPayload, @Body() dto: ParentMessageDto) {
    return this.features.parentMessage(u, dto);
  }

  @Roles('TEACHER', 'ADMIN') @Throttle(CHAT) @Post('chat/stream')
  async chatStream(@CurrentUser() u: CurrentUserPayload, @Body() dto: ChatDto, @Res() res: Response) {
    await this.sse(res, this.features.generalChatStream(u, dto));
  }

  /* ── Hamma rol (student uchun test paytida cheklanadi) ── */

  @Throttle(GEN) @Post('grade')
  grade(@CurrentUser() u: CurrentUserPayload, @Body() dto: GradeAnswerDto) {
    return this.features.grade(u, dto);
  }

  @Throttle(GEN) @Post('recommendations')
  recommendations(@CurrentUser() u: CurrentUserPayload, @Body() dto: RecommendationsDto) {
    return this.features.recommendations(u, dto);
  }

  @Throttle(LIGHT) @Post('mascot')
  mascot(@CurrentUser() u: CurrentUserPayload, @Body() dto: MascotDto) {
    return this.features.mascot(u, dto);
  }

  @Throttle(CHAT) @Post('tutor/stream')
  async tutorStream(@CurrentUser() u: CurrentUserPayload, @Body() dto: TutorChatDto, @Res() res: Response) {
    await this.sse(res, this.features.tutorStream(u, dto));
  }

  /** SSE: `data: {"delta":"..."}` ... `data: [DONE]` (umumiy mantiq: ../sse-response.util.ts) */
  private sse(res: Response, gen: AsyncGenerator<string>): Promise<void> {
    return streamSse(res, gen, (delta) => ({ delta }));
  }
}
