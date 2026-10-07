// src/modules/ai/assistant/tools/teacher-tools.ts
//
// O'QITUVCHI (va ADMIN) tool'lari. Ruxsat qarorlari mavjud servislarda:
//  - GroupsService.findOneOrThrow / TeacherService.getGroupStudents — o'qituvchi faqat O'Z guruhini ko'radi
//  - TestManagementService.list — o'qituvchi faqat O'Z testlarini ko'radi
//  - AnalyticsService — o'qituvchi faqat O'Z testining statistikasini ko'radi
// Bu tool'lar ruxsat mantig'ini takrorlamaydi — servisga topshiradi.
import { TestStatus } from '@prisma/client';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { GroupsService } from '../../../groups/groups.service';
import { RankingService } from '../../../ranking/ranking.service';
import { TeacherService } from '../../../teacher/teacher.service';
import { TestManagementService } from '../../../tests/management/test-management.service';
import { defineTool } from '../assistant.types';
import { capList, cut, reader } from '../tool-input';

export interface TeacherToolDeps {
  groups: GroupsService;
  teacher: TeacherService;
  tests: TestManagementService;
  ranking: RankingService;
  analytics: AnalyticsService;
}

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };
const groupIdSchema = {
  type: 'object',
  properties: { groupId: { type: 'string', description: "Guruh id si (avval list_my_groups bilan oling)" } },
  required: ['groupId'],
  additionalProperties: false,
};
const ROLES = ['TEACHER', 'ADMIN'] as const;

export function teacherTools(d: TeacherToolDeps) {
  const fullName = (s: { firstName: string; lastName?: string | null }) => [s.firstName, s.lastName].filter(Boolean).join(' ');

  return [
    defineTool<Record<string, never>>({
      name: 'list_my_groups',
      label: 'Guruhlaringiz olinmoqda',
      description: "Foydalanuvchi ko'ra oladigan guruhlar ro'yxati (o'qituvchi uchun — o'z guruhlari, admin uchun — hammasi): id, nom, o'quvchilar soni. Boshqa guruh tool'lariga id kerak bo'lganda birinchi shuni chaqir.",
      inputSchema: NO_ARGS,
      roles: [...ROLES],
      parse: () => ({}),
      run: async (user) => {
        const groups = await d.groups.findAllForUser(user);
        const { items, total, truncated } = capList(groups, 40);
        return {
          total,
          truncated,
          groups: items.map((g) => ({
            id: g.id,
            name: g.name,
            students: g._count.members,
            teacher: g.teacher ? fullName(g.teacher) : null,
          })),
        };
      },
    }),

    defineTool<{ groupId: string }>({
      name: 'get_group_students',
      label: "Guruh o'quvchilari olinmoqda",
      description: "Guruh o'quvchilari: ball, daraja, topshirgan testlar soni va o'rtacha foiz (past o'rtachalilar tepada). Guruh holatini baholash uchun ishlat.",
      inputSchema: groupIdSchema,
      roles: [...ROLES],
      parse: (raw) => ({ groupId: reader(raw).id('groupId') }),
      run: async (user, { groupId }) => {
        const students = await d.teacher.getGroupStudents(groupId, user);
        const sorted = [...students].sort((a, b) => (a.averagePercent ?? -1) - (b.averagePercent ?? -1));
        const { items, total, truncated } = capList(sorted, 60);
        return {
          total,
          truncated,
          students: items.map((s) => ({
            id: s.id,
            name: fullName(s),
            totalScore: s.totalScore,
            level: s.level,
            testsCompleted: s.testsCompleted,
            averagePercent: s.averagePercent,
          })),
        };
      },
    }),

    defineTool<{ groupId: string; thresholdPercent: number }>({
      name: 'find_struggling_students',
      label: "Qiynalayotgan o'quvchilar aniqlanmoqda",
      description:
        "Guruhda e'tibor kerak bo'lgan o'quvchilar: o'rtacha foizi chegaradan past yoki hali birorta test topshirmaganlar. " +
        "\"Kimga yordam kerak?\", \"kim orqada qolyapti?\" savollarida ishlat.",
      inputSchema: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'Guruh id si' },
          thresholdPercent: { type: 'integer', minimum: 1, maximum: 100, description: "O'rtacha foiz chegarasi (standart 60)" },
        },
        required: ['groupId'],
        additionalProperties: false,
      },
      roles: [...ROLES],
      parse: (raw) => {
        const r = reader(raw);
        return { groupId: r.id('groupId'), thresholdPercent: r.int('thresholdPercent', { min: 1, max: 100, def: 60 }) };
      },
      run: async (user, { groupId, thresholdPercent }) => {
        const students = await d.teacher.getGroupStudents(groupId, user);
        const lowAverage = students
          .filter((s) => s.averagePercent !== null && s.averagePercent < thresholdPercent)
          .sort((a, b) => (a.averagePercent as number) - (b.averagePercent as number))
          .map((s) => ({ id: s.id, name: fullName(s), averagePercent: s.averagePercent, testsCompleted: s.testsCompleted }));
        const noTestsYet = students.filter((s) => s.testsCompleted === 0).map((s) => ({ id: s.id, name: fullName(s) }));
        return {
          thresholdPercent,
          totalStudents: students.length,
          lowAverage: capList(lowAverage, 30).items,
          noTestsYet: capList(noTestsYet, 30).items,
        };
      },
    }),

    defineTool<{ groupId: string }>({
      name: 'get_group_ranking',
      label: 'Guruh reytingi olinmoqda',
      description: "Guruh ichidagi eng yaxshi 10 o'quvchi (ball bo'yicha).",
      inputSchema: groupIdSchema,
      roles: [...ROLES],
      parse: (raw) => ({ groupId: reader(raw).id('groupId') }),
      run: async (user, { groupId }) => {
        await d.groups.findOneOrThrow(groupId, user); // ruxsat: o'qituvchi faqat o'z guruhi
        const top = await d.ranking.getGroupRanking(groupId, 10);
        return { top: top.map((e) => ({ rank: e.rank, name: e.firstName, totalScore: e.totalScore })) };
      },
    }),

    defineTool<{ status?: TestStatus }>({
      name: 'list_tests',
      label: 'Testlar ro\'yxati olinmoqda',
      description: "Testlar ro'yxati (o'qituvchi uchun — o'zi yaratganlari, admin uchun — hammasi): id, sarlavha, holat, savollar/biriktirishlar/urinishlar soni. Statistika uchun testId kerak bo'lganda chaqir.",
      inputSchema: {
        type: 'object',
        properties: { status: { type: 'string', enum: Object.values(TestStatus), description: 'Holat bo\'yicha filtr (ixtiyoriy)' } },
        additionalProperties: false,
      },
      roles: [...ROLES],
      parse: (raw) => ({ status: reader(raw).oneOf('status', Object.values(TestStatus)) }),
      run: async (user, { status }) => {
        const tests = await d.tests.list(user, { status });
        const { items, total, truncated } = capList(tests, 30);
        return {
          total,
          truncated,
          tests: items.map((t) => ({
            id: t.id,
            title: cut(t.title, 120),
            status: t.status,
            questions: t._count.questions,
            assignments: t._count.assignments,
            attempts: t._count.attempts,
            created: t.createdAt.toISOString().slice(0, 10),
          })),
        };
      },
    }),

    defineTool<{ testId: string }>({
      name: 'get_test_analytics',
      label: 'Test statistikasi olinmoqda',
      description:
        "Bitta test statistikasi: ishtirokchilar, o'rtacha/eng yuqori/eng past ball, o'tish foizi, o'rtacha vaqt va eng qiyin 5 ta savol. " +
        "testId ni avval list_tests dan ol.",
      inputSchema: {
        type: 'object',
        properties: { testId: { type: 'string', description: 'Test id si' } },
        required: ['testId'],
        additionalProperties: false,
      },
      roles: [...ROLES],
      parse: (raw) => ({ testId: reader(raw).id('testId') }),
      run: async (user, { testId }) => {
        const [summary, questions] = await Promise.all([
          d.analytics.getTestAnalytics(testId, user),
          d.analytics.getQuestionAnalyticsForTest(testId, user),
        ]);
        return {
          summary,
          hardestQuestions: questions
            .filter((q) => q.totalAnswered > 0)
            .slice(0, 5)
            .map((q) => ({ question: cut(q.questionText, 200), answered: q.totalAnswered, accuracyPercent: q.accuracyPercent })),
        };
      },
    }),
  ];
}
