// src/modules/ai/features/ai-features.service.ts
import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AiConfig } from '../ai.config';
import { AiService } from '../ai.service';
import { AiAccessService } from './ai-access.service';
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
import * as P from './ai-prompts';

@Injectable()
export class AiFeaturesService {
  constructor(
    private readonly ai: AiService,
    private readonly access: AiAccessService,
    private readonly cfg: AiConfig,
  ) {}

  private json<T>(user: CurrentUserPayload, feature: string, spec: P.PromptSpec, tier: 'fast' | 'smart' = 'fast') {
    return this.ai.completeJson<T>(
      user,
      feature,
      {
        system: spec.system,
        messages: [{ role: 'user', content: spec.user }],
        temperature: spec.temperature,
        maxTokens: spec.maxTokens,
      },
      tier,
    );
  }

  /* ───── O'qituvchi / admin ───── */

  async material(user: CurrentUserPayload, dto: GenerateMaterialDto) {
    const raw = await this.json(user, 'generate-material', P.materialPrompt(dto));
    return P.normalizeMaterial(raw, dto.topic);
  }

  async questions(user: CurrentUserPayload, dto: GenerateQuestionsDto) {
    const raw = await this.json(user, 'generate-questions', P.questionsPrompt(dto));
    return { questions: P.normalizeQuestions(raw, dto.count) };
  }

  async singleQuestion(user: CurrentUserPayload, dto: GenerateSingleQuestionDto) {
    const raw = await this.json(user, 'generate-question', P.singleQuestionPrompt(dto));
    return P.normalizeSingleQuestion(raw);
  }

  async lessonPlan(user: CurrentUserPayload, dto: LessonPlanDto) {
    const raw = await this.json(user, 'lesson-plan', P.lessonPlanPrompt(dto), 'smart');
    return P.normalizeLessonPlan(raw);
  }

  async parentMessage(user: CurrentUserPayload, dto: ParentMessageDto) {
    const spec = P.parentMessagePrompt(dto);
    const res = await this.ai.complete(
      user,
      'parent-message',
      { system: spec.system, messages: [{ role: 'user', content: spec.user }], temperature: spec.temperature, maxTokens: spec.maxTokens },
      'fast',
    );
    return { message: res.text.trim() };
  }

  /* ───── Student (anti-cheat tekshiruvi bilan) ───── */

  async grade(user: CurrentUserPayload, dto: GradeAnswerDto) {
    // Mavjud "AIAnswerCheck" funksiyasi test paytida ishlaydi; AI_ALLOW_GRADE_DURING_TEST=false bilan o'chiriladi.
    await this.access.assertAllowed(user, { allowInTest: this.cfg.allowGradeDuringTest });
    const raw = await this.json(user, 'grade-answer', P.gradePrompt(dto), 'smart');
    return P.normalizeGrading(raw);
  }

  async recommendations(user: CurrentUserPayload, dto: RecommendationsDto) {
    await this.access.assertAllowed(user);
    const raw = await this.json(user, 'recommendations', P.recommendationsPrompt(dto));
    return { recommendations: P.normalizeRecommendations(raw) };
  }

  async mascot(user: CurrentUserPayload, dto: MascotDto) {
    await this.access.assertAllowed(user);
    const studentName = await this.access.displayName(user.id);
    const raw = await this.json(user, 'mascot', P.mascotPrompt({ ...dto, studentName }));
    return P.normalizeMascot(raw);
  }

  /* ───── Streaming chat: faqat matn bo'laklarini yield qiladi ───── */

  async *tutorStream(user: CurrentUserPayload, dto: TutorChatDto): AsyncGenerator<string> {
    await this.access.assertAllowed(user); // repetitor test paytida HECH QACHON ishlamaydi
    const studentName = await this.access.displayName(user.id);
    yield* this.textStream(user, 'tutor', P.buildTutorSystemPrompt({ studentName, weakTopics: dto.weakTopics }), dto, 'smart');
  }

  async *generalChatStream(user: CurrentUserPayload, dto: ChatDto): AsyncGenerator<string> {
    yield* this.textStream(user, 'chat', P.GENERAL_CHAT_SYSTEM_PROMPT, dto, 'fast');
  }

  private async *textStream(
    user: CurrentUserPayload,
    feature: string,
    system: string,
    dto: ChatDto,
    tier: 'fast' | 'smart',
  ): AsyncGenerator<string> {
    const messages = P.normalizeHistory(dto.history);
    for await (const ev of this.ai.stream(user, feature, { system, messages, temperature: 0.7, maxTokens: 1024 }, tier)) {
      if (ev.type === 'text') yield ev.text;
    }
  }
}
