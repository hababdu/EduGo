// src/modules/ai/assistant/tools/admin-tools.ts
//
// FAQAT ADMIN (va SUPER_ADMIN) tool'lari. Maxfiy maydonlar (telefon, telegramId) HECH QACHON chiqarilmaydi:
// natija qo'lda tanlangan maydonlar (whitelist) bilan quriladi, servis obyekti to'g'ridan-to'g'ri qaytarilmaydi.
import { AdminStudentsService } from '../../../admin/students/admin-students.service';
import { ListStudentsQueryDto } from '../../../admin/students/dto/admin-students.dto';
import { OverviewService } from '../../../admin/overview/overview.service';
import { defineTool } from '../assistant.types';
import { reader } from '../tool-input';

export interface AdminToolDeps {
  overview: OverviewService;
  students: AdminStudentsService;
}

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };
const STATUSES = ['ACTIVE', 'BLOCKED', 'PENDING'] as const;
const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function adminTools(d: AdminToolDeps) {
  return [
    defineTool<Record<string, never>>({
      name: 'get_platform_overview',
      label: 'Platforma ko\'rsatkichlari olinmoqda',
      description: "Platforma umumiy ko'rsatkichlari: o'quvchilar/o'qituvchilar/kurslar/testlar soni, faol o'quvchilar (7 kun), bugungi urinishlar, oxirgi 7 kunlik faol foydalanuvchilar dinamikasi.",
      inputSchema: NO_ARGS,
      roles: ['ADMIN'],
      parse: () => ({}),
      run: async () => {
        const o = await d.overview.getOverview();
        return { totals: o.totals, todayTestAttempts: o.today.testAttempts, dailyActiveUsersLast7Days: o.charts.dailyActiveUsers };
      },
    }),

    defineTool<{ search?: string; status?: (typeof STATUSES)[number]; groupId?: string; page: number }>({
      name: 'search_students',
      label: "O'quvchilar qidirilmoqda",
      description: "O'quvchilarni ism/familiya/username bo'yicha qidirish (10 tadan sahifalab). Holat (ACTIVE/BLOCKED/PENDING) yoki guruh bo'yicha filtrlash mumkin. Tafsilot uchun get_student_detail ga id bering.",
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Ism, familiya yoki username' },
          status: { type: 'string', enum: [...STATUSES] },
          groupId: { type: 'string', description: 'Guruh id si (ixtiyoriy)' },
          page: { type: 'integer', minimum: 1, maximum: 20, description: 'Sahifa (standart 1)' },
        },
        additionalProperties: false,
      },
      roles: ['ADMIN'],
      parse: (raw) => {
        const r = reader(raw);
        return {
          search: r.optStr('search', { max: 100 }),
          status: r.oneOf('status', STATUSES),
          groupId: r.optId('groupId'),
          page: r.int('page', { min: 1, max: 20, def: 1 }),
        };
      },
      run: async (_user, input) => {
        const res = await d.students.list({ ...input, pageSize: 10 } as ListStudentsQueryDto);
        return {
          total: res.total,
          page: res.page,
          totalPages: res.totalPages,
          students: res.items.map((s) => ({
            id: s.id,
            name: [s.firstName, s.lastName].filter(Boolean).join(' '),
            username: s.username,
            status: s.status,
            level: s.level,
            totalScore: s.totalScore,
            lastActive: day(s.lastActiveAt),
          })),
        };
      },
    }),

    defineTool<{ studentId: string }>({
      name: 'get_student_detail',
      label: "O'quvchi ma'lumotlari olinmoqda",
      description: "Bitta o'quvchining to'liq ko'rinishi: holat, daraja/ball, streak, guruhlar, oxirgi 10 ta test natijasi, yutuqlar. studentId ni avval search_students dan ol.",
      inputSchema: {
        type: 'object',
        properties: { studentId: { type: 'string', description: "O'quvchi id si" } },
        required: ['studentId'],
        additionalProperties: false,
      },
      roles: ['ADMIN'],
      parse: (raw) => ({ studentId: reader(raw).id('studentId') }),
      run: async (_user, { studentId }) => {
        const u = await d.students.getDetail(studentId);
        return {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' '),
          username: u.username,
          status: u.status,
          registered: day(u.registeredAt),
          lastActive: day(u.lastActiveAt),
          level: u.studentProfile?.level ?? 1,
          totalScore: u.studentProfile?.totalScore ?? 0,
          xp: u.studentProfile?.totalXp ?? 0,
          streak: { current: u.streak?.currentStreak ?? 0, longest: u.streak?.longestStreak ?? 0 },
          groups: u.groupMemberships.map((m) => m.group.name),
          recentAttempts: u.testAttempts.map((a) => ({
            test: a.test.title,
            percent: Math.round(a.percent),
            passed: a.passed,
            date: day(a.completedAt),
          })),
          achievements: u.achievements.map((a) => a.achievement.title),
        };
      },
    }),
  ];
}
