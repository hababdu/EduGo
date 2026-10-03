import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import { AssistantDataService } from './assistant-data.service';
import { AssistantToolRegistry, MAX_TOOL_RESULT_CHARS, TOOL_TIMEOUT_MS } from './assistant-tool.registry';

const ID = 'cmfx1234abcd5678efgh9012';
const student = { id: 'student-1-id', telegramId: '1', role: 'STUDENT', status: 'ACTIVE' } as any;
const teacher = { id: 'teacher-A-id', telegramId: '2', role: 'TEACHER', status: 'ACTIVE' } as any;
const admin = { id: 'admin-1-id', telegramId: '3', role: 'ADMIN', status: 'ACTIVE' } as any;

export function makeRegistry(over: Record<string, any> = {}) {
  const m = { dashboard: {}, tests: {}, ranking: {}, streak: {}, challenges: {}, data: {}, groups: {}, teacher: {}, analytics: {}, overview: {}, students: {}, ...over };
  return new AssistantToolRegistry(m.dashboard, m.tests, m.ranking, m.streak, m.challenges, m.data, m.groups, m.teacher, m.analytics, m.overview, m.students);
}
const parse = (o: { ok: boolean; content: string }) => JSON.parse(o.content);

describe("O'quvchi tool'lari — faqat o'z ma'lumoti", () => {
  it('get_my_results: model yuborgan begona studentId e\'tiborsiz; servis FAQAT so\'rovchi id si bilan chaqiriladi', async () => {
    const data = { myResults: jest.fn().mockResolvedValue([{ test: 'T', percent: 80 }]) };
    const out = await makeRegistry({ data }).execute(student, 'get_my_results', { studentId: 'boshqa-oquvchi-id', userId: 'boshqa', limit: 3 });
    expect(out.ok).toBe(true);
    expect(data.myResults).toHaveBeenCalledWith('student-1-id', 3);
  });

  it("get_my_overview: keraksiz maydonlar (rasm URL) kesiladi", async () => {
    const dashboard = {
      getStudentDashboard: jest.fn().mockResolvedValue({
        student: { firstName: 'Ali', profilePhotoUrl: 'https://x/p.jpg', streak: 4, rank: 7 },
        continueLesson: { subjectId: 's1', subjectTitle: 'Algebra', progressPercent: 40 },
        subjects: [{ id: 's1', title: 'Algebra', posterUrl: 'https://x/a.jpg', progressPercent: 40 }],
        stats: { totalScore: 120, xp: 300, level: 2, xpIntoLevel: 300, xpForNextLevel: 500 },
        recentResults: [{ testTitle: 'T1', percent: 71.6, passed: true }],
        achievements: [{ id: 'a', title: 'Birinchi qadam', iconUrl: 'https://x/i.png' }],
      }),
    };
    const out = await makeRegistry({ dashboard }).execute(student, 'get_my_overview', {});
    expect(dashboard.getStudentDashboard).toHaveBeenCalledWith('student-1-id');
    expect(parse(out)).toMatchObject({ name: 'Ali', rank: 7, streakDays: 4, recentResults: [{ test: 'T1', percent: 72, passed: true }], achievements: ['Birinchi qadam'] });
    expect(out.content).not.toMatch(/posterUrl|iconUrl|profilePhotoUrl|https?:/);
  });

  it("get_my_ranking: username chiqmaydi, isMe belgilanadi", async () => {
    const ranking = {
      getStudentRank: jest.fn().mockResolvedValue(2),
      getGlobalRanking: jest.fn().mockResolvedValue([
        { studentId: 'x', firstName: 'Vali', username: 'vali_secret', totalScore: 500, rank: 1 },
        { studentId: 'student-1-id', firstName: 'Ali', username: 'ali_u', totalScore: 400, rank: 2 },
      ]),
    };
    const out = await makeRegistry({ ranking }).execute(student, 'get_my_ranking', {});
    expect(parse(out).top).toEqual([
      { rank: 1, name: 'Vali', totalScore: 500, isMe: false },
      { rank: 2, name: 'Ali', totalScore: 400, isMe: true },
    ]);
    expect(out.content).not.toContain('secret');
  });

  it("get_my_weak_topics: ma'lumot yo'q bo'lsa tushuntirish qaytaradi", async () => {
    const out = await makeRegistry({ data: { myWeakTopics: jest.fn().mockResolvedValue([]) } }).execute(student, 'get_my_weak_topics', {});
    expect(parse(out)).toMatchObject({ topics: [], note: expect.stringContaining('yetarli') });
  });
});

describe("Rol chegaralari (registry)", () => {
  it("o'quvchi admin tool'ini chaqira olmaydi: bajarilmaydi va servis chaqirilmaydi", async () => {
    const overview = { getOverview: jest.fn() };
    const out = await makeRegistry({ overview }).execute(student, 'get_platform_overview', {});
    expect(out.ok).toBe(false);
    expect(parse(out).error).toContain('mavjud emas');
    expect(overview.getOverview).not.toHaveBeenCalled();
  });

  it("o'qituvchi admin tool'ini ham, o'quvchi tool'ini ham chaqira olmaydi", async () => {
    const students = { getDetail: jest.fn(), list: jest.fn() };
    const dashboard = { getStudentDashboard: jest.fn() };
    const reg = makeRegistry({ students, dashboard });
    expect((await reg.execute(teacher, 'get_student_detail', { studentId: ID })).ok).toBe(false);
    expect((await reg.execute(teacher, 'search_students', { search: 'ali' })).ok).toBe(false);
    expect((await reg.execute(teacher, 'get_my_overview', {})).ok).toBe(false);
    expect(students.getDetail).not.toHaveBeenCalled();
    expect(students.list).not.toHaveBeenCalled();
    expect(dashboard.getStudentDashboard).not.toHaveBeenCalled();
  });

  it("admin o'quvchi (shaxsiy) tool'larini ishlata olmaydi — ularda admin uchun ma'no yo'q", async () => {
    expect((await makeRegistry().execute(admin, 'get_my_results', {})).ok).toBe(false);
  });

  it("uydirma tool nomi rad etiladi", async () => {
    expect((await makeRegistry().execute(admin, 'drop_database', {})).ok).toBe(false);
  });
});

describe("O'qituvchi tool'lari — ownership servislarga topshiriladi", () => {
  it("boshqa o'qituvchining guruhi: servis Forbidden tashlaydi -> ma'lumot QAYTMAYDI, xabar modelga boradi", async () => {
    const teacherSvc = { getGroupStudents: jest.fn().mockRejectedValue(new ForbiddenException('Bu guruh sizga biriktirilmagan')) };
    const out = await makeRegistry({ teacher: teacherSvc }).execute(teacher, 'get_group_students', { groupId: ID });
    expect(teacherSvc.getGroupStudents).toHaveBeenCalledWith(ID, teacher); // so'rovchi obyekti servisga uzatildi
    expect(out.ok).toBe(false);
    expect(parse(out)).toEqual({ error: 'Bu guruh sizga biriktirilmagan' });
  });

  it('get_group_ranking: avval guruhga kirish huquqi tekshiriladi, ruxsat bo\'lmasa reyting o\'qilmaydi', async () => {
    const groups = { findOneOrThrow: jest.fn().mockRejectedValue(new ForbiddenException('Bu guruh sizga biriktirilmagan')) };
    const ranking = { getGroupRanking: jest.fn() };
    const out = await makeRegistry({ groups, ranking }).execute(teacher, 'get_group_ranking', { groupId: ID });
    expect(out.ok).toBe(false);
    expect(ranking.getGroupRanking).not.toHaveBeenCalled();
  });

  it("find_struggling_students: chegaradan pastlar va hali test topshirmaganlarni ajratadi", async () => {
    const teacherSvc = {
      getGroupStudents: jest.fn().mockResolvedValue([
        { id: 'a', firstName: 'Ali', lastName: 'V', totalScore: 10, level: 1, testsCompleted: 3, averagePercent: 45 },
        { id: 'b', firstName: 'Vali', lastName: null, totalScore: 90, level: 2, testsCompleted: 4, averagePercent: 88 },
        { id: 'c', firstName: 'Sami', lastName: null, totalScore: 0, level: 1, testsCompleted: 0, averagePercent: null },
        { id: 'd', firstName: 'Dilya', lastName: null, totalScore: 5, level: 1, testsCompleted: 2, averagePercent: 30 },
      ]),
    };
    const out = parse(await makeRegistry({ teacher: teacherSvc }).execute(teacher, 'find_struggling_students', { groupId: ID }));
    expect(out.thresholdPercent).toBe(60);
    expect(out.lowAverage.map((s: any) => s.name)).toEqual(['Dilya', 'Ali V']); // eng pasti tepada
    expect(out.noTestsYet.map((s: any) => s.name)).toEqual(['Sami']);
    expect(out.totalStudents).toBe(4);
  });

  it("list_tests: noto'g'ri holat filtri modelga tushuntirish bilan qaytariladi", async () => {
    const tests = { list: jest.fn() };
    const out = await makeRegistry({ tests }).execute(teacher, 'list_tests', { status: 'HAMMASI' });
    expect(out.ok).toBe(false);
    expect(parse(out).error).toContain('DRAFT, PUBLISHED, ARCHIVED');
    expect(tests.list).not.toHaveBeenCalled();
  });

  it("get_test_analytics (HAQIQIY AnalyticsService bilan): o'qituvchi faqat O'Z testini ko'radi", async () => {
    const prisma: any = {
      test: { findUnique: jest.fn().mockResolvedValue({ id: ID, title: 'Algebra', createdById: 'teacher-B-id' }) },
      testAttempt: { findMany: jest.fn().mockResolvedValue([]) },
      testQuestion: { findMany: jest.fn().mockResolvedValue([]) },
      testAnswer: { findMany: jest.fn() },
    };
    const reg = makeRegistry({ analytics: new AnalyticsService(prisma) });
    const denied = await reg.execute(teacher, 'get_test_analytics', { testId: ID });
    expect(denied.ok).toBe(false);
    expect(parse(denied).error).toBe('Bu test sizga tegishli emas');
    expect(prisma.testAttempt.findMany).not.toHaveBeenCalled();
    expect((await reg.execute(admin, 'get_test_analytics', { testId: ID })).ok).toBe(true);
  });
});

describe('Admin tool\'lari — maxfiy maydonlar chiqmaydi', () => {
  it('get_student_detail: telefon va telegramId natijada YO\'Q', async () => {
    const students = {
      getDetail: jest.fn().mockResolvedValue({
        id: 'st1', firstName: 'Ali', lastName: 'Valiyev', username: 'ali', phone: '+998901234567', telegramId: '555111222',
        status: 'ACTIVE', registeredAt: new Date('2026-01-05'), lastActiveAt: new Date('2026-09-28'),
        studentProfile: { level: 3, totalScore: 250, totalXp: 900 },
        streak: { currentStreak: 5, longestStreak: 12 },
        groupMemberships: [{ group: { name: '10-A', posterUrl: 'x' } }],
        testAttempts: [{ percent: 91.4, passed: true, completedAt: new Date('2026-09-20'), test: { title: 'Geometriya' } }],
        achievements: [{ achievement: { title: 'Ustoz', iconUrl: 'i' } }],
      }),
    };
    const out = await makeRegistry({ students }).execute(admin, 'get_student_detail', { studentId: ID });
    expect(out.ok).toBe(true);
    expect(out.content).not.toMatch(/998901234567|555111222|phone|telegramId|iconUrl|posterUrl/);
    expect(parse(out)).toMatchObject({ name: 'Ali Valiyev', level: 3, groups: ['10-A'], recentAttempts: [{ test: 'Geometriya', percent: 91, passed: true, date: '2026-09-20' }] });
  });

  it('search_students: sahifa 10 ta bilan servisga o\'tadi', async () => {
    const students = { list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 2, totalPages: 0 }) };
    await makeRegistry({ students }).execute(admin, 'search_students', { search: 'ali', status: 'ACTIVE', page: 2 });
    expect(students.list).toHaveBeenCalledWith({ search: 'ali', status: 'ACTIVE', groupId: undefined, page: 2, pageSize: 10 });
  });
});

describe('Registry: xavfsiz bajarish', () => {
  it("kutilmagan xato matni foydalanuvchi/modelga SIZMAYDI", async () => {
    const data = { myResults: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED postgres://user:PAROL@db:5432')) };
    const out = await makeRegistry({ data }).execute(student, 'get_my_results', {});
    expect(out.ok).toBe(false);
    expect(out.content).not.toContain('PAROL');
    expect(parse(out).error).toContain('xatolik');
  });

  it("juda katta natija rad etiladi (kontekstni to'ldirmaslik uchun)", async () => {
    const data = { myResults: jest.fn().mockResolvedValue([{ x: 'a'.repeat(MAX_TOOL_RESULT_CHARS) }]) };
    const out = await makeRegistry({ data }).execute(student, 'get_my_results', {});
    expect(out.ok).toBe(false);
    expect(parse(out).error).toContain('katta');
  });

  it('tool osilib qolsa timeout bilan to\'xtaydi', async () => {
    jest.useFakeTimers();
    try {
      const data = { myResults: jest.fn().mockReturnValue(new Promise(() => undefined)) };
      const p = makeRegistry({ data }).execute(student, 'get_my_results', {});
      await jest.advanceTimersByTimeAsync(TOOL_TIMEOUT_MS + 1);
      const out = await p;
      expect(out.ok).toBe(false);
      expect(parse(out).error).toContain('uzoq');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('AssistantDataService.myWeakTopics', () => {
  const ans = (topicId: string | null, subjectId: string | null, isCorrect: boolean) => ({ isCorrect, question: { topicId, subjectId } });
  const rep = (n: number, f: () => any) => Array.from({ length: n }, f);

  it("mavzu bo'yicha aniqlikni hisoblaydi: eng zaif tepada, <3 javobli mavzu tashlanadi, so'rov studentId bilan cheklangan", async () => {
    const prisma: any = {
      testAnswer: {
        findMany: jest.fn().mockResolvedValue([
          ...rep(4, () => ans('t-kasr', 's1', false)), ans('t-kasr', 's1', true), // kasr: 1/5 = 20%
          ...rep(3, () => ans('t-foiz', 's1', true)), ans('t-foiz', 's1', false), // foiz: 3/4 = 75%
          ans('t-oz', 's1', false), ans('t-oz', 's1', false), // 2 ta javob — yetarli emas
          ...rep(3, () => ans(null, 's2', false)), // mavzusiz savollar -> fan darajasida: 0/3
        ]),
      },
      topic: {
        findMany: jest.fn().mockResolvedValue([
          { id: 't-kasr', title: 'Kasrlar', section: { subject: { title: 'Matematika' } } },
          { id: 't-foiz', title: 'Foizlar', section: { subject: { title: 'Matematika' } } },
        ]),
      },
      subject: { findMany: jest.fn().mockResolvedValue([{ id: 's2', title: 'Fizika' }]) },
    };
    const res = await new AssistantDataService(prisma).myWeakTopics('student-1-id', 5);
    expect(prisma.testAnswer.findMany.mock.calls[0][0].where).toEqual({ session: { studentId: 'student-1-id' }, isCorrect: { not: null } });
    expect(res).toEqual([
      { title: 'Fizika', subject: null, answered: 3, correct: 0, accuracyPercent: 0 },
      { title: 'Kasrlar', subject: 'Matematika', answered: 5, correct: 1, accuracyPercent: 20 },
      { title: 'Foizlar', subject: 'Matematika', answered: 4, correct: 3, accuracyPercent: 75 },
    ]);
  });

  it("javoblar bo'lmasa qo'shimcha so'rov yubormaydi", async () => {
    const prisma: any = { testAnswer: { findMany: jest.fn().mockResolvedValue([]) }, topic: { findMany: jest.fn() }, subject: { findMany: jest.fn() } };
    expect(await new AssistantDataService(prisma).myWeakTopics('u', 5)).toEqual([]);
    expect(prisma.topic.findMany).not.toHaveBeenCalled();
  });
});
