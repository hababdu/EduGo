import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 51-band — TEST ANALYTICS */
  async getTestAnalytics(testId: string) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test topilmadi');

    const attempts = await this.prisma.testAttempt.findMany({ where: { testId } });

    if (attempts.length === 0) {
      return {
        testTitle: test.title,
        participants: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTimeSeconds: 0,
        passRate: 0,
        failRate: 0,
      };
    }

    const scores = attempts.map((a) => a.score);
    const passedCount = attempts.filter((a) => a.passed).length;

    return {
      testTitle: test.title,
      participants: attempts.length,
      averageScore: Math.round(scores.reduce((s, v) => s + v, 0) / attempts.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averageTimeSeconds: Math.round(
        attempts.reduce((s, a) => s + a.timeSpentSeconds, 0) / attempts.length,
      ),
      passRate: Math.round((passedCount / attempts.length) * 100),
      failRate: Math.round(((attempts.length - passedCount) / attempts.length) * 100),
    };
  }

  /**
   * 52-band — QUESTION ANALYTICS.
   * Testdagi har bir savol uchun to'g'ri/xato foizi — "eng qiyin savol"ni
   * aniqlash uchun ishlatiladi.
   */
  async getQuestionAnalyticsForTest(testId: string) {
    const testQuestions = await this.prisma.testQuestion.findMany({
      where: { testId },
      include: { question: { select: { id: true, text: true } } },
      orderBy: { order: 'asc' },
    });

    const results = await Promise.all(
      testQuestions.map(async (tq) => {
        const answers = await this.prisma.testAnswer.findMany({
          where: {
            questionId: tq.questionId,
            session: { testId },
            isCorrect: { not: null },
          },
        });

        const total = answers.length;
        const correct = answers.filter((a) => a.isCorrect).length;

        return {
          questionId: tq.questionId,
          questionText: tq.question.text,
          totalAnswered: total,
          correctCount: correct,
          wrongCount: total - correct,
          accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : null,
        };
      }),
    );

    // Eng qiyin savollar tepada (accuracy past bo'lganlari)
    return results.sort((a, b) => (a.accuracyPercent ?? 100) - (b.accuracyPercent ?? 100));
  }
}
