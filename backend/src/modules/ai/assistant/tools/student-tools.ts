// src/modules/ai/assistant/tools/student-tools.ts
//
// O'QUVCHI tool'lari. Hech birida "kimning" ma'lumoti degan parametr YO'Q:
// hamma narsa faqat so'rovchining o'z id si (user.id) bilan olinadi.
import { DashboardService } from '../../../dashboard/dashboard.service';
import { ChallengesService } from '../../../gamification/challenges/challenges.service';
import { StreakService } from '../../../gamification/streak/streak.service';
import { RankingService } from '../../../ranking/ranking.service';
import { TestManagementService } from '../../../tests/management/test-management.service';
import { AssistantDataService } from '../assistant-data.service';
import { defineTool } from '../assistant.types';
import { capList, cut, reader } from '../tool-input';

export interface StudentToolDeps {
  dashboard: DashboardService;
  tests: TestManagementService;
  ranking: RankingService;
  streak: StreakService;
  challenges: ChallengesService;
  data: AssistantDataService;
}

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };
const limitSchema = (max: number, def: number) => ({
  type: 'object',
  properties: { limit: { type: 'integer', minimum: 1, maximum: max, description: `Nechta yozuv (standart ${def})` } },
  additionalProperties: false,
});

export function studentTools(d: StudentToolDeps) {
  return [
    defineTool<Record<string, never>>({
      name: 'get_my_overview',
      label: "Umumiy ko'rsatkichlaringiz tekshirilmoqda",
      description:
        "O'quvchining umumiy holati: ism, reytingdagi o'rni, streak, daraja/XP/ball, fanlar bo'yicha progress, oxirgi natijalar va yutuqlar. " +
        "\"Qanday ketyapman?\", \"progressim?\", \"nima qilishim kerak?\" kabi umumiy savollarda birinchi shu tool'ni ishlat.",
      inputSchema: NO_ARGS,
      roles: ['STUDENT'],
      parse: () => ({}),
      run: async (user) => {
        const r = await d.dashboard.getStudentDashboard(user.id);
        return {
          name: r.student.firstName,
          streakDays: r.student.streak,
          rank: r.student.rank,
          level: r.stats.level,
          xp: r.stats.xp,
          xpIntoLevel: r.stats.xpIntoLevel,
          xpForNextLevel: r.stats.xpForNextLevel,
          totalScore: r.stats.totalScore,
          continueSubject: r.continueLesson
            ? { title: r.continueLesson.subjectTitle, progressPercent: r.continueLesson.progressPercent }
            : null,
          subjects: r.subjects.map((s) => ({ title: s.title, progressPercent: s.progressPercent })),
          recentResults: r.recentResults.map((x) => ({ test: x.testTitle, percent: Math.round(x.percent), passed: x.passed })),
          achievements: r.achievements.map((a) => a.title),
        };
      },
    }),

    defineTool<{ limit: number }>({
      name: 'get_my_results',
      label: 'Test natijalaringiz olinmoqda',
      description: "O'quvchining so'nggi test natijalari (foiz, o'tdi/o'tmadi, sana, fan). Natijalar tarixi yoki dinamikasi so'ralganda ishlat.",
      inputSchema: limitSchema(20, 10),
      roles: ['STUDENT'],
      parse: (raw) => ({ limit: reader(raw).int('limit', { min: 1, max: 20, def: 10 }) }),
      run: async (user, { limit }) => ({ results: await d.data.myResults(user.id, limit) }),
    }),

    defineTool<{ limit: number }>({
      name: 'get_my_weak_topics',
      label: 'Zaif mavzularingiz aniqlanmoqda',
      description:
        "O'quvchi eng ko'p xato qilayotgan mavzular (to'g'ri javoblar foizi bo'yicha, past→yuqori). Faqat yakunlangan testlar asosida. " +
        "\"Nimani takrorlashim kerak?\", \"qaysi mavzuda zaifman?\" savollarida ishlat. Ma'lumot kam bo'lsa, bo'sh ro'yxat qaytadi.",
      inputSchema: limitSchema(10, 5),
      roles: ['STUDENT'],
      parse: (raw) => ({ limit: reader(raw).int('limit', { min: 1, max: 10, def: 5 }) }),
      run: async (user, { limit }) => {
        const topics = await d.data.myWeakTopics(user.id, limit);
        return topics.length
          ? { topics }
          : { topics: [], note: "Hali yetarli ma'lumot yo'q (kamida bir nechta yakunlangan test kerak)" };
      },
    }),

    defineTool<Record<string, never>>({
      name: 'get_my_assigned_tests',
      label: 'Sizga berilgan testlar tekshirilmoqda',
      description: "O'quvchiga biriktirilgan testlar: holati (PENDING/COMPLETED/RETAKE_AVAILABLE), muddati, davomiyligi, natijasi. \"Qanday testlarim bor?\", \"muddati qachon?\" savollarida ishlat.",
      inputSchema: NO_ARGS,
      roles: ['STUDENT'],
      parse: () => ({}),
      run: async (user) => {
        const list = await d.tests.listAssignedForStudent(user.id);
        const { items, total, truncated } = capList(list, 30);
        return {
          total,
          truncated,
          tests: items.map((t) => ({
            title: t.title,
            status: t.status,
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : null,
            minutes: Math.round(t.durationSeconds / 60),
            score: t.score != null && t.maxScore != null ? `${t.score}/${t.maxScore}` : null,
            passed: t.passed ?? null,
          })),
        };
      },
    }),

    defineTool<Record<string, never>>({
      name: 'get_my_ranking',
      label: 'Reytingingiz tekshirilmoqda',
      description: "O'quvchining global reytingdagi o'rni va eng yaxshi 5 talik. \"Reytingda nechanchiman?\" savolida ishlat.",
      inputSchema: NO_ARGS,
      roles: ['STUDENT'],
      parse: () => ({}),
      run: async (user) => {
        const [rank, top] = await Promise.all([d.ranking.getStudentRank(user.id), d.ranking.getGlobalRanking(5)]);
        return {
          myRank: rank || null,
          top: top.map((e) => ({ rank: e.rank, name: e.firstName, totalScore: e.totalScore, isMe: e.studentId === user.id })),
        };
      },
    }),

    defineTool<Record<string, never>>({
      name: 'get_my_streak_and_challenge',
      label: 'Streak va bugungi challenge tekshirilmoqda',
      description: "Ketma-ket faol kunlar (streak) va bugungi maxsus challenge (bajarilganmi yoki yo'qmi). Motivatsiya va \"bugun nima qilay?\" savollarida ishlat.",
      inputSchema: NO_ARGS,
      roles: ['STUDENT'],
      parse: () => ({}),
      run: async (user) => {
        const [streak, challenge] = await Promise.all([d.streak.getStreak(user.id), d.challenges.getToday(user.id)]);
        return {
          currentStreak: streak?.currentStreak ?? 0,
          longestStreak: streak?.longestStreak ?? 0,
          todayChallenge: challenge
            ? {
                title: cut(challenge.title, 120),
                test: challenge.test?.title ?? null,
                rewardScore: challenge.rewardScore,
                rewardXp: challenge.rewardXp,
                completed: challenge.completed,
              }
            : null,
        };
      },
    }),
  ];
}
