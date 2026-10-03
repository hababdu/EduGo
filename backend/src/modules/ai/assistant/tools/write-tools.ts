// src/modules/ai/assistant/tools/write-tools.ts
//
// YOZUVCHI tool'lar. Model ularni chaqirganda HECH NARSA o'zgarmaydi: `prepare` holatni tekshirib
// kartochka matnini SERVER tomonda quradi, amal PENDING saqlanadi. `execute` faqat foydalanuvchi
// tasdiqlagandan keyin chaqiriladi va MAVJUD servis orqali (so'rovchi nomidan, o'sha servisning
// audit yozuvi bilan) bajariladi.
//
// Ba'zi mavjud endpointlarda ruxsat bo'shliqlari bor (masalan publish() egasini tekshirmaydi).
// Yordamchi bu bo'shliqlarni KENGAYTIRMASLIGI uchun kerakli cheklovlar shu yerda, tool darajasida qo'yilgan.
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';
import { AdminStudentsService } from '../../../admin/students/admin-students.service';
import { AssignTestDto } from '../../../tests/management/dto/test.dto';
import { TestManagementService } from '../../../tests/management/test-management.service';
import { AssistantDataService } from '../assistant-data.service';
import { AssistantWriteTool, defineWriteTool, effectiveRole } from '../assistant.types';
import { reader, ToolInputError } from '../tool-input';

export interface WriteToolDeps {
  tests: TestManagementService;
  students: AdminStudentsService;
  data: AssistantDataService;
}

export const MAX_SCORE_ADJUST = 500;

const fullName = (u: { firstName: string; lastName?: string | null }) => [u.firstName, u.lastName].filter(Boolean).join(' ');

export function writeTools(d: WriteToolDeps): AssistantWriteTool[] {
  /** publish() servisida egasini tekshirish YO'Q — o'qituvchi faqat O'Z testini e'lon qila oladi (admin — hammasini). */
  async function loadPublishable(user: CurrentUserPayload, testId: string) {
    const test = await d.data.testBrief(testId);
    if (!test || test.deletedAt) throw new NotFoundException('Test topilmadi');
    if (effectiveRole(user.role) === 'TEACHER' && test.createdById !== user.id) {
      throw new ForbiddenException('Bu test sizga tegishli emas');
    }
    if (test.status === 'PUBLISHED') throw new BadRequestException("Test allaqachon e'lon qilingan");
    return test;
  }

  return [
    /* ───────────── Test biriktirish ───────────── */
    defineWriteTool<{ testId: string; targetType: 'GROUP' | 'INDIVIDUAL'; groupId?: string; studentId?: string; deadline?: { iso: string; label: string } }>({
      name: 'assign_test',
      description:
        "Testni guruhga yoki bitta o'quvchiga biriktirishni TAKLIF qiladi (foydalanuvchi tasdiqlagandan keyin bajariladi; o'quvchilarga bildirishnoma ketadi). " +
        "Faqat o'zi yaratgan testni va o'z guruhi/o'quvchisiga biriktirish mumkin. testId/groupId/studentId ni avval ro'yxat tool'laridan ol. " +
        "Hamma o'quvchilarga (ALL) biriktirish yordamchi orqali mumkin emas.",
      inputSchema: {
        type: 'object',
        properties: {
          testId: { type: 'string', description: 'Test id si (list_tests dan)' },
          targetType: { type: 'string', enum: ['GROUP', 'INDIVIDUAL'] },
          groupId: { type: 'string', description: "targetType=GROUP bo'lsa majburiy (list_my_groups dan)" },
          studentId: { type: 'string', description: "targetType=INDIVIDUAL bo'lsa majburiy (get_group_students dan)" },
          deadline: { type: 'string', description: 'Muddat (ixtiyoriy): YYYY-MM-DD, kelajakda' },
        },
        required: ['testId', 'targetType'],
        additionalProperties: false,
      },
      roles: ['TEACHER', 'ADMIN'],
      risk: 'MEDIUM',
      parse: (raw) => {
        const r = reader(raw);
        const targetType = r.oneOf('targetType', ['GROUP', 'INDIVIDUAL'] as const);
        if (!targetType) throw new ToolInputError('"targetType" majburiy (GROUP yoki INDIVIDUAL)');
        return {
          testId: r.id('testId'),
          targetType,
          groupId: targetType === 'GROUP' ? r.id('groupId') : undefined,
          studentId: targetType === 'INDIVIDUAL' ? r.id('studentId') : undefined,
          deadline: r.futureDate('deadline'),
        };
      },
      prepare: async (user, i) => {
        const test = await d.data.testBrief(i.testId);
        if (!test || test.deletedAt) throw new NotFoundException('Test topilmadi');
        // TestManagementService.assign bilan bir xil qoida (u bajarishda ham tekshiradi)
        if (test.createdById !== user.id) throw new ForbiddenException('Bu test sizga tegishli emas');

        const details = [{ label: 'Test', value: test.title }];
        let target: string;
        if (i.targetType === 'GROUP') {
          const group = await d.data.groupBrief(i.groupId!);
          if (!group) throw new NotFoundException('Guruh topilmadi');
          if (group.teacherId !== user.id) throw new ForbiddenException('Bu guruh sizga tegishli emas');
          target = `"${group.name}" guruhiga`;
          details.push({ label: 'Guruh', value: group.name });
        } else {
          const student = await d.data.studentBrief(i.studentId!);
          if (!student) throw new NotFoundException("O'quvchi topilmadi");
          // Servis buni tekshirmaydi; yordamchi uchun qat'iyroq: o'qituvchi faqat O'Z guruhidagi o'quvchiga
          if (effectiveRole(user.role) === 'TEACHER' && !(await d.data.isStudentInTeacherGroups(user.id, student.id))) {
            throw new ForbiddenException("Bu o'quvchi sizning guruhlaringizda emas");
          }
          target = `${fullName(student)} ga`;
          details.push({ label: "O'quvchi", value: fullName(student) });
        }
        details.push({ label: 'Muddat', value: i.deadline?.label ?? "belgilanmagan" });
        details.push({ label: 'Bildirishnoma', value: "O'quvchilarga yuboriladi" });
        if (test.status !== 'PUBLISHED') {
          details.push({ label: 'Diqqat', value: `Test hali e'lon qilinmagan (${test.status})` });
        }
        return { summary: `"${test.title}" testini ${target} biriktirish`, details };
      },
      execute: async (user, i) => {
        const dto = { targetType: i.targetType, groupId: i.groupId, studentId: i.studentId, deadline: i.deadline?.iso } as AssignTestDto;
        const a = await d.tests.assign(i.testId, dto, user.id, user.role);
        return { assignmentId: (a as any)?.id };
      },
    }),

    /* ───────────── Testni e'lon qilish ───────────── */
    defineWriteTool<{ testId: string }>({
      name: 'publish_test',
      description:
        "Testni e'lon qilishni (DRAFT → PUBLISHED) TAKLIF qiladi; tasdiqlangach o'quvchilar uni ko'ra oladigan bo'ladi. " +
        "O'qituvchi faqat o'z testini e'lon qila oladi. testId ni list_tests dan ol.",
      inputSchema: {
        type: 'object',
        properties: { testId: { type: 'string', description: 'Test id si' } },
        required: ['testId'],
        additionalProperties: false,
      },
      roles: ['TEACHER', 'ADMIN'],
      risk: 'MEDIUM',
      parse: (raw) => ({ testId: reader(raw).id('testId') }),
      prepare: async (user, { testId }) => {
        const test = await loadPublishable(user, testId);
        return {
          summary: `"${test.title}" testini e'lon qilish`,
          details: [
            { label: 'Test', value: test.title },
            { label: 'Hozirgi holat', value: test.status },
            { label: "Oqibat", value: "O'quvchilar testni ko'ra oladigan bo'ladi" },
          ],
        };
      },
      execute: async (user, { testId }) => {
        await loadPublishable(user, testId); // holat tasdiq kutilgan vaqtda o'zgargan bo'lishi mumkin
        return d.tests.publish(testId, user.id, user.role);
      },
    }),

    /* ───────────── Ball o'zgartirish (faqat admin) ───────────── */
    defineWriteTool<{ studentId: string; amount: number; reason: string }>({
      name: 'adjust_student_score',
      description:
        "O'quvchi ballini qo'lda o'zgartirishni TAKLIF qiladi (musbat = qo'shish, manfiy = ayirish; 1..500). Sabab MAJBURIY va uni foydalanuvchidan ol — o'zingdan to'qima. " +
        "studentId ni search_students dan ol. Audit jurnaliga yoziladi.",
      inputSchema: {
        type: 'object',
        properties: {
          studentId: { type: 'string' },
          amount: { type: 'integer', minimum: -MAX_SCORE_ADJUST, maximum: MAX_SCORE_ADJUST, description: "Nolga teng bo'lmagan butun son" },
          reason: { type: 'string', description: "Sabab (5..200 belgi), foydalanuvchi aytgani" },
        },
        required: ['studentId', 'amount', 'reason'],
        additionalProperties: false,
      },
      roles: ['ADMIN'],
      risk: 'HIGH',
      parse: (raw) => {
        const r = reader(raw);
        const amount = r.int('amount', { min: -MAX_SCORE_ADJUST, max: MAX_SCORE_ADJUST, def: 0 });
        if (amount === 0) throw new ToolInputError('"amount" nolga teng bo\'lmasligi kerak');
        return { studentId: r.id('studentId'), amount, reason: r.str('reason', { min: 5, max: 200 }) };
      },
      prepare: async (_user, i) => {
        const s = await d.students.getDetail(i.studentId); // mavjud bo'lmasa 404
        const current = s.studentProfile?.totalScore;
        if (current === undefined) throw new NotFoundException('Student profili topilmadi');
        if (current + i.amount < 0) throw new BadRequestException(`Ball manfiy bo'lib qoladi (hozir ${current})`);
        return {
          summary: `${fullName(s)} ballini ${i.amount > 0 ? '+' : ''}${i.amount} ga o'zgartirish`,
          details: [
            { label: "O'quvchi", value: fullName(s) },
            { label: 'Hozirgi ball', value: String(current) },
            { label: "O'zgarish", value: `${i.amount > 0 ? '+' : ''}${i.amount}` },
            { label: 'Yangi ball', value: String(current + i.amount) },
            { label: 'Sabab', value: i.reason },
          ],
        };
      },
      execute: (user, i) => d.students.adjustScore(i.studentId, { amount: i.amount, reason: `${i.reason} (AI yordamchi orqali)` }, user.id),
    }),

    /* ───────────── Bloklash / blokdan chiqarish (faqat admin) ───────────── */
    defineWriteTool<{ studentId: string; blocked: boolean }>({
      name: 'set_student_blocked',
      description:
        "O'quvchini bloklash (blocked=true) yoki blokdan chiqarish (blocked=false)ni TAKLIF qiladi. Bloklangan o'quvchi ilovaga kira olmaydi. studentId ni search_students dan ol.",
      inputSchema: {
        type: 'object',
        properties: { studentId: { type: 'string' }, blocked: { type: 'boolean' } },
        required: ['studentId', 'blocked'],
        additionalProperties: false,
      },
      roles: ['ADMIN'],
      risk: 'HIGH',
      parse: (raw) => {
        const r = reader(raw);
        return { studentId: r.id('studentId'), blocked: r.bool('blocked') };
      },
      prepare: async (_user, i) => {
        const s = await d.students.getDetail(i.studentId);
        if (i.blocked && s.status === 'BLOCKED') throw new BadRequestException("O'quvchi allaqachon bloklangan");
        if (!i.blocked && s.status !== 'BLOCKED') throw new BadRequestException("O'quvchi bloklanmagan");
        return {
          summary: `${fullName(s)} ni ${i.blocked ? 'bloklash' : 'blokdan chiqarish'}`,
          details: [
            { label: "O'quvchi", value: fullName(s) },
            { label: 'Hozirgi holat', value: s.status },
            { label: 'Yangi holat', value: i.blocked ? 'BLOCKED' : 'ACTIVE' },
            { label: 'Oqibat', value: i.blocked ? 'Ilovaga kira olmaydi' : 'Ilovaga qayta kira oladi' },
          ],
        };
      },
      execute: (user, i) => d.students.setBlocked(i.studentId, i.blocked, user.id),
    }),
  ];
}
