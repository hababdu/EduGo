// src/modules/ai/assistant/assistant-data.service.ts
//
// Mavjud servislarda yo'q, faqat yordamchi uchun kerak bo'lgan O'QISH so'rovlari.
// HAR BIR so'rov studentId bilan cheklangan: student faqat o'z ma'lumotini oladi.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const MIN_ANSWERS_FOR_WEAK_TOPIC = 3;

@Injectable()
export class AssistantDataService {
  constructor(private readonly prisma: PrismaService) {}

  async myResults(studentId: string, limit: number) {
    const rows = await this.prisma.testAttempt.findMany({
      where: { studentId },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        percent: true,
        passed: true,
        score: true,
        maxScore: true,
        timeSpentSeconds: true,
        completedAt: true,
        test: { select: { title: true, subject: { select: { title: true } } } },
      },
    });
    return rows.map((r) => ({
      test: r.test.title,
      subject: r.test.subject?.title ?? null,
      percent: Math.round(r.percent),
      passed: r.passed,
      score: `${r.score}/${r.maxScore}`,
      minutes: Math.round(r.timeSpentSeconds / 60),
      date: r.completedAt.toISOString().slice(0, 10),
    }));
  }

  /**
   * Mavzu bo'yicha aniqlik (to'g'ri javoblar ulushi) — faqat YAKUNLANGAN testlar
   * (isCorrect faqat topshirilgandan keyin to'ldiriladi). Alohida javoblar emas, faqat jamlanma qaytadi.
   */
  async myWeakTopics(studentId: string, limit: number) {
    const answers = await this.prisma.testAnswer.findMany({
      where: { session: { studentId }, isCorrect: { not: null } },
      orderBy: { answeredAt: 'desc' },
      take: 2000,
      select: { isCorrect: true, question: { select: { topicId: true, subjectId: true } } },
    });

    type Bucket = { kind: 'topic' | 'subject'; id: string; answered: number; correct: number };
    const buckets = new Map<string, Bucket>();
    for (const a of answers) {
      const kind = a.question.topicId ? 'topic' : a.question.subjectId ? 'subject' : null;
      const id = a.question.topicId ?? a.question.subjectId;
      if (!kind || !id) continue;
      const key = `${kind}:${id}`;
      const b = buckets.get(key) ?? { kind, id, answered: 0, correct: 0 };
      b.answered += 1;
      if (a.isCorrect) b.correct += 1;
      buckets.set(key, b);
    }

    const ranked = [...buckets.values()]
      .filter((b) => b.answered >= MIN_ANSWERS_FOR_WEAK_TOPIC)
      .map((b) => ({ ...b, accuracyPercent: Math.round((b.correct / b.answered) * 100) }))
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent || b.answered - a.answered)
      .slice(0, limit);
    if (!ranked.length) return [];

    const topicIds = ranked.filter((r) => r.kind === 'topic').map((r) => r.id);
    const subjectIds = ranked.filter((r) => r.kind === 'subject').map((r) => r.id);
    const [topics, subjects] = await Promise.all([
      this.prisma.topic.findMany({
        where: { id: { in: topicIds } },
        select: { id: true, title: true, section: { select: { subject: { select: { title: true } } } } },
      }),
      this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }),
    ]);
    const topicMap = new Map(topics.map((t) => [t.id, t]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    return ranked.map((r) => {
      const t = r.kind === 'topic' ? topicMap.get(r.id) : undefined;
      const s = r.kind === 'subject' ? subjectMap.get(r.id) : undefined;
      return {
        title: t?.title ?? s?.title ?? "Noma'lum",
        subject: t?.section.subject.title ?? null,
        answered: r.answered,
        correct: r.correct,
        accuracyPercent: r.accuracyPercent,
      };
    });
  }

  /* ───── Yozuvchi amallarni tayyorlash (prepare) uchun qisqa ma'lumotlar ───── */

  testBrief(testId: string) {
    return this.prisma.test.findUnique({
      where: { id: testId },
      select: { id: true, title: true, status: true, createdById: true, deletedAt: true },
    });
  }

  groupBrief(groupId: string) {
    return this.prisma.group.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true, name: true, teacherId: true },
    });
  }

  studentBrief(studentId: string) {
    return this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
  }

  /** O'qituvchi faqat O'Z guruhlaridagi o'quvchiga individual test biriktira oladi. */
  async isStudentInTeacherGroups(teacherId: string, studentId: string): Promise<boolean> {
    const m = await this.prisma.groupMember.findFirst({
      where: { studentId, group: { teacherId, deletedAt: null } },
      select: { id: true },
    });
    return !!m;
  }
}
