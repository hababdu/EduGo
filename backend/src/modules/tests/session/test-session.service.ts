import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { seededShuffle } from './seeded-shuffle.util';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ChallengesService } from '../../gamification/challenges/challenges.service';

@Injectable()
export class TestSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly challengesService: ChallengesService,
  ) {}

  /**
   * 16-band — TESTNI BOSHLASH.
   * 25-band — bir marta ishlash qoidasi shu yerda birinchi marta tekshiriladi.
   * 24-band — agar sessiya bor bo'lsa, shuni qaytaradi (davom ettirish).
   */
  async start(testId: string, studentId: string) {
    const test = await this.getPublishedTestOrThrow(testId);
    this.assertWithinSchedule(test);

    // 25-band: bir marta ishlash
    const existingAttempt = await this.prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (existingAttempt && !existingAttempt.isRetakeAllowed) {
      throw new ForbiddenException(
        '🔒 Bu test allaqachon tugatilgan. Qayta ishlash uchun administratorga murojaat qiling.',
      );
    }

    // 24-band: mavjud sessiyani davom ettirish
    const existingSession = await this.prisma.testSession.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (existingSession && existingSession.status === 'IN_PROGRESS') {
      const remaining = this.computeRemainingSeconds(existingSession);
      if (remaining > 0) {
        return this.buildSessionResponse(existingSession, test);
      }
      // Vaqt tugagan — avtomatik yakunlaymiz, keyin xato qaytaramiz
      await this.autoSubmitExpired(existingSession, test);
      throw new ForbiddenException('⏰ Test vaqti tugagan edi, avtomatik yakunlandi.');
    }

    // Yangi sessiya — savollarni tanlash (18-band: RANDOM QUESTIONS)
    const allTestQuestions = await this.prisma.testQuestion.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      select: { questionId: true },
    });
    let selectedIds = allTestQuestions.map((q) => q.questionId);

    if (test.randomQuestions && test.questionCount && test.questionCount < selectedIds.length) {
      selectedIds = this.pickRandom(selectedIds, test.questionCount);
    }

    const session = await this.prisma.testSession.create({
      data: {
        testId,
        studentId,
        durationSeconds: test.durationSeconds,
        selectedQuestionIds: selectedIds,
        answerOrderSeed: Math.floor(Math.random() * 1_000_000),
      },
    });

    return this.buildSessionResponse(session, test);
  }

  /** 23-band — TEST PROGRESS AUTO-SAVE */
  async saveAnswer(testId: string, studentId: string, dto: SubmitAnswerDto) {
    const session = await this.getActiveSessionOrThrow(testId, studentId);

    if (!session.selectedQuestionIds.includes(dto.questionId)) {
      throw new BadRequestException('Bu savol ushbu sessiyaga tegishli emas');
    }

    return this.prisma.testAnswer.upsert({
      where: { sessionId_questionId: { sessionId: session.id, questionId: dto.questionId } },
      create: {
        sessionId: session.id,
        questionId: dto.questionId,
        selectedOptionIds: dto.selectedOptionIds ?? [],
        textAnswer: dto.textAnswer,
      },
      update: {
        selectedOptionIds: dto.selectedOptionIds ?? [],
        textAnswer: dto.textAnswer,
      },
    });
  }

  /** 24-band — frontend timer'iga ishonmasdan, har safar serverdan qayta hisoblash */
  async getSession(testId: string, studentId: string) {
    const session = await this.getActiveSessionOrThrow(testId, studentId);
    const test = await this.getPublishedTestOrThrow(testId);

    const remaining = this.computeRemainingSeconds(session);
    if (remaining <= 0) {
      await this.autoSubmitExpired(session, test);
      throw new ForbiddenException('⏰ Test vaqti tugagan edi, avtomatik yakunlandi.');
    }

    const savedAnswers = await this.prisma.testAnswer.findMany({
      where: { sessionId: session.id },
    });

    const response = await this.buildSessionResponse(session, test);
    return {
      ...response,
      savedAnswers: savedAnswers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        textAnswer: a.textAnswer,
      })),
    };
  }

  /** 28-band, 84-band — SUBMIT: baholash, ScoreTransaction, XP */
  async submit(testId: string, studentId: string) {
    const session = await this.getActiveSessionOrThrow(testId, studentId);
    const test = await this.getPublishedTestOrThrow(testId);
    return this.gradeAndFinish(session, test, false);
  }

  // ---------------------------------------------------------------

  private async gradeAndFinish(session: any, test: any, isAutoSubmit: boolean) {
    const [answers, questions] = await Promise.all([
      this.prisma.testAnswer.findMany({ where: { sessionId: session.id } }),
      this.prisma.question.findMany({
        where: { id: { in: session.selectedQuestionIds } },
        include: { options: true },
      }),
    ]);

    const questionMap = new Map<string, (typeof questions)[number]>(
      questions.map((q) => [q.id, q]),
    );
    let score = 0;
    let maxScore = 0;
    const gradedAnswers: { id: string; isCorrect: boolean | null }[] = [];

    for (const questionId of session.selectedQuestionIds as string[]) {
      const question = questionMap.get(questionId);
      if (!question) continue;
      maxScore += question.points;

      const answer = answers.find((a) => a.questionId === questionId);
      if (!answer) continue; // javob berilmagan — 0 ball, isCorrect=null qoladi

      let isCorrect: boolean | null = null;

      if (question.type === 'TEXT_ANSWER') {
        // Matnli javoblar avtomatik baholanmaydi — kelajakda qo'lda tekshirish
        // navbatiga qo'shiladi (bu MVP doirasidan tashqarida).
        isCorrect = null;
      } else {
        const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
        const selectedIds = [...answer.selectedOptionIds].sort();
        isCorrect =
          correctIds.length === selectedIds.length &&
          correctIds.every((id, i) => id === selectedIds[i]);
      }

      if (isCorrect) score += question.points;
      gradedAnswers.push({ id: answer.id, isCorrect });
    }

    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percent >= test.passingScore;
    const timeSpentSeconds = Math.round(
      (Date.now() - new Date(session.startedAt).getTime()) / 1000,
    );

    // 40-band — DAILY CHALLENGE: agar bu test bugungi challenge bilan bog'liq bo'lsa,
    // qo'shimcha bonus ball/XP beriladi (faqat test o'tilgan bo'lsa, isAutoSubmit=false holatida ham hisoblanadi)
    const challenge = await this.challengesService.findActiveChallengeForTest(test.id);

    await this.prisma.$transaction([
      // Har bir javobning isCorrect'ini yozamiz
      ...gradedAnswers.map((a) =>
        this.prisma.testAnswer.update({ where: { id: a.id }, data: { isCorrect: a.isCorrect } }),
      ),
      this.prisma.testSession.update({
        where: { id: session.id },
        data: { status: isAutoSubmit ? 'EXPIRED' : 'SUBMITTED' },
      }),
      this.prisma.testAttempt.upsert({
        where: { testId_studentId: { testId: test.id, studentId: session.studentId } },
        create: {
          testId: test.id,
          studentId: session.studentId,
          sessionId: session.id,
          score,
          maxScore,
          percent,
          passed,
          timeSpentSeconds,
        },
        update: {
          sessionId: session.id,
          score,
          maxScore,
          percent,
          passed,
          timeSpentSeconds,
          isRetakeAllowed: false, // qayta topshirilgach, keyingisi uchun yana admin ruxsati kerak
          completedAt: new Date(),
        },
      }),
      this.prisma.scoreTransaction.create({
        data: {
          studentId: session.studentId,
          amount: score,
          type: 'TEST_REWARD',
          subjectId: test.subjectId,
          testId: test.id,
          description: `Test: ${test.title}`,
        },
      }),
      this.prisma.studentProfile.update({
        where: { userId: session.studentId },
        data: {
          totalScore: { increment: score },
          totalXp: { increment: Math.round(score / 2) }, // 36-band: XP ball bilan bog'liq, lekin alohida
        },
      }),
      // Challenge bonusi — alohida ScoreTransaction(type=CHALLENGE) sifatida
      ...(challenge
        ? [
            this.prisma.scoreTransaction.create({
              data: {
                studentId: session.studentId,
                amount: challenge.rewardScore,
                type: 'CHALLENGE',
                testId: test.id,
                description: `Kunlik challenge: ${challenge.title}`,
              },
            }),
            this.prisma.xPTransaction.create({
              data: { studentId: session.studentId, amount: challenge.rewardXp, source: 'CHALLENGE' },
            }),
            this.prisma.studentProfile.update({
              where: { userId: session.studentId },
              data: {
                totalScore: { increment: challenge.rewardScore },
                totalXp: { increment: challenge.rewardXp },
              },
            }),
          ]
        : []),
    ]);

    await this.emitScoreChanged(session.studentId, score + (challenge?.rewardScore ?? 0), test.subjectId);

    return { score, maxScore, percent, passed, timeSpentSeconds, autoSubmitted: isAutoSubmit };
  }

  /**
   * 33,66-band — REAL-TIME. ScoreTransaction yaratilgandan keyin event
   * chiqariladi; RankingGateway buni tinglab, WebSocket orqali tarqatadi.
   * Bu yerda to'g'ridan-to'g'ri gateway chaqirilmaydi — EventEmitter orqali
   * bo'sh bog'lanish (loose coupling) saqlanadi.
   */
  private async emitScoreChanged(studentId: string, score: number, subjectId: string | null) {
    const groupIds = (
      await this.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      })
    ).map((g) => g.groupId);

    this.eventEmitter.emit('score.changed', {
      studentId,
      delta: score,
      source: 'TEST_REWARD',
      subjectId,
      groupIds,
    });
  }

  private async autoSubmitExpired(session: any, test: any) {
    await this.gradeAndFinish(session, test, true);
  }

  private computeRemainingSeconds(session: { startedAt: Date; durationSeconds: number }): number {
    const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
    return Math.max(0, Math.round(session.durationSeconds - elapsed));
  }

  private pickRandom<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  private async buildSessionResponse(session: any, test: any) {
    const questions = await this.prisma.question.findMany({
      where: { id: { in: session.selectedQuestionIds } },
      include: {
        // isCorrect HECH QACHON studentga yuborilmaydi — shuning uchun select bilan chiqarib tashlanadi
        options: { select: { id: true, text: true, order: true } },
      },
    });

    // selectedQuestionIds tartibini saqlash uchun qayta joylashtiramiz
    const orderedQuestions = session.selectedQuestionIds
      .map((id: string) => questions.find((q) => q.id === id))
      .filter(Boolean);

    const questionsForClient = orderedQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.points,
      options: test.randomAnswerOrder
        ? seededShuffle(q.options, session.answerOrderSeed ?? 0, q.id)
        : q.options,
    }));

    return {
      sessionId: session.id,
      testTitle: test.title,
      remainingSeconds: this.computeRemainingSeconds(session),
      questions: questionsForClient,
    };
  }

  private async getPublishedTestOrThrow(testId: string) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test || test.deletedAt || test.status !== 'PUBLISHED') {
      throw new NotFoundException('Test topilmadi yoki hali e\'lon qilinmagan');
    }
    return test;
  }

  private assertWithinSchedule(test: { startDate: Date | null; endDate: Date | null }) {
    const now = new Date();
    if (test.startDate && now < test.startDate) {
      throw new ForbiddenException('Bu test hali boshlanmagan');
    }
    if (test.endDate && now > test.endDate) {
      throw new ForbiddenException('Bu testni topshirish muddati tugagan');
    }
  }

  private async getActiveSessionOrThrow(testId: string, studentId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (!session || session.status !== 'IN_PROGRESS') {
      throw new NotFoundException(
        'Faol test sessiyasi topilmadi. Avval testni "Boshlash" orqali boshlang.',
      );
    }
    return session;
  }
}
