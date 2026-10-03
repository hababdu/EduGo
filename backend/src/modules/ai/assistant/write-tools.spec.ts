import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MAX_SCORE_ADJUST, writeTools } from './tools/write-tools';
import { ToolInputError } from './tool-input';

const ID = (c: string) => `cm${c.repeat(20)}`; // haqiqiy cuid shakli
const teacher = { id: 'teacher-A-id', telegramId: '1', role: 'TEACHER', status: 'ACTIVE' } as any;
const admin = { id: 'admin-1-id', telegramId: '2', role: 'ADMIN', status: 'ACTIVE' } as any;
const FUTURE = '2099-12-31';

function build(over: { data?: any; tests?: any; students?: any } = {}) {
  const data = {
    testBrief: jest.fn().mockResolvedValue({ id: ID('t'), title: 'Algebra 1', status: 'PUBLISHED', createdById: 'teacher-A-id', deletedAt: null }),
    groupBrief: jest.fn().mockResolvedValue({ id: ID('g'), name: '10-A', teacherId: 'teacher-A-id' }),
    studentBrief: jest.fn().mockResolvedValue({ id: ID('s'), firstName: 'Ali', lastName: 'Valiyev', status: 'ACTIVE' }),
    isStudentInTeacherGroups: jest.fn().mockResolvedValue(true),
    ...over.data,
  };
  const tests = { assign: jest.fn().mockResolvedValue({ id: 'asg-1' }), publish: jest.fn().mockResolvedValue({ ok: true, status: 'PUBLISHED' }), ...over.tests };
  const students = {
    getDetail: jest.fn().mockResolvedValue({ id: ID('s'), firstName: 'Ali', lastName: 'Valiyev', status: 'ACTIVE', studentProfile: { totalScore: 250 } }),
    adjustScore: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    setBlocked: jest.fn().mockResolvedValue({ id: ID('s'), status: 'BLOCKED' }),
    ...over.students,
  };
  const tools = writeTools({ tests: tests as any, students: students as any, data: data as any });
  const tool = (n: string) => tools.find((t) => t.name === n)!;
  return { data, tests, students, tool };
}

describe('assign_test', () => {
  const input = (o: any = {}) => ({ testId: ID('t'), targetType: 'GROUP', groupId: ID('g'), deadline: FUTURE, ...o });

  it("guruhga: kartochka matni bazadagi holatdan quriladi; bajarishda MAVJUD servis chaqiriladi (muddat Toshkent kun oxiri)", async () => {
    const { tool, tests } = build();
    const t = tool('assign_test');
    const i = t.parse(input());
    const p = await t.prepare(teacher, i);
    expect(p.summary).toBe('"Algebra 1" testini "10-A" guruhiga biriktirish');
    expect(p.details).toEqual(expect.arrayContaining([{ label: 'Guruh', value: '10-A' }, { label: 'Muddat', value: `${FUTURE} (kun oxirigacha)` }, { label: 'Bildirishnoma', value: "O'quvchilarga yuboriladi" }]));
    await t.execute(teacher, i);
    expect(tests.assign).toHaveBeenCalledWith(ID('t'), { targetType: 'GROUP', groupId: ID('g'), studentId: undefined, deadline: '2099-12-31T18:59:00.000Z' }, 'teacher-A-id', 'TEACHER');
  });

  it("boshqa o'qituvchining testi / guruhi: prepare rad etadi (taklif yaratilmaydi)", async () => {
    const other = build({ data: { testBrief: jest.fn().mockResolvedValue({ id: ID('t'), title: 'X', status: 'PUBLISHED', createdById: 'teacher-B-id', deletedAt: null }) } });
    await expect(other.tool('assign_test').prepare(teacher, other.tool('assign_test').parse(input()))).rejects.toThrow('Bu test sizga tegishli emas');
    const g = build({ data: { groupBrief: jest.fn().mockResolvedValue({ id: ID('g'), name: 'Boshqa', teacherId: 'teacher-B-id' }) } });
    await expect(g.tool('assign_test').prepare(teacher, g.tool('assign_test').parse(input()))).rejects.toThrow('Bu guruh sizga tegishli emas');
    const missing = build({ data: { testBrief: jest.fn().mockResolvedValue(null) } });
    await expect(missing.tool('assign_test').prepare(teacher, missing.tool('assign_test').parse(input()))).rejects.toBeInstanceOf(NotFoundException);
  });

  it("individual: o'qituvchi faqat O'Z guruhidagi o'quvchiga (servis buni tekshirmaydi — yordamchi qat'iyroq)", async () => {
    const { tool, data } = build({ data: { isStudentInTeacherGroups: jest.fn().mockResolvedValue(false) } });
    const t = tool('assign_test');
    const i = t.parse({ testId: ID('t'), targetType: 'INDIVIDUAL', studentId: ID('s') });
    await expect(t.prepare(teacher, i)).rejects.toThrow("Bu o'quvchi sizning guruhlaringizda emas");
    expect(data.isStudentInTeacherGroups).toHaveBeenCalledWith('teacher-A-id', ID('s'));
    // admin uchun guruh a'zoligi talab qilinmaydi (lekin test egasi bo'lishi shart — servis qoidasi)
    const adminTest = build({ data: { testBrief: jest.fn().mockResolvedValue({ id: ID('t'), title: 'T', status: 'PUBLISHED', createdById: 'admin-1-id', deletedAt: null }) } });
    await expect(adminTest.tool('assign_test').prepare(admin, adminTest.tool('assign_test').parse({ testId: ID('t'), targetType: 'INDIVIDUAL', studentId: ID('s') }))).resolves.toMatchObject({ summary: expect.stringContaining('Ali Valiyev ga') });
  });

  it("kirish tekshiruvi: ALL ruxsat etilmaydi, turga mos id majburiy, muddat kelajakda bo'lishi shart va haqiqiy sana", () => {
    const { tool } = build();
    const t = tool('assign_test');
    expect(() => t.parse(input({ targetType: 'ALL' }))).toThrow(ToolInputError);
    expect(() => t.parse({ testId: ID('t'), targetType: 'GROUP' })).toThrow(/groupId/);
    expect(() => t.parse({ testId: ID('t'), targetType: 'INDIVIDUAL' })).toThrow(/studentId/);
    expect(() => t.parse({ testId: ID('t') })).toThrow(/targetType/);
    expect(() => t.parse(input({ deadline: '2020-01-01' }))).toThrow(/kelajakdagi/);
    expect(() => t.parse(input({ deadline: '2099-02-30' }))).toThrow(/mavjud bo'lmagan/);
    expect(() => t.parse(input({ deadline: 'ertaga' }))).toThrow(ToolInputError);
    expect(t.parse({ testId: ID('t'), targetType: 'GROUP', groupId: ID('g') }).deadline).toBeUndefined();
  });

  it("e'lon qilinmagan test uchun ogohlantirish qatori qo'shiladi", async () => {
    const { tool } = build({ data: { testBrief: jest.fn().mockResolvedValue({ id: ID('t'), title: 'T', status: 'DRAFT', createdById: 'teacher-A-id', deletedAt: null }) } });
    const p = await tool('assign_test').prepare(teacher, tool('assign_test').parse(input()));
    expect(p.details).toContainEqual({ label: 'Diqqat', value: "Test hali e'lon qilinmagan (DRAFT)" });
  });
});

describe('publish_test — mavjud publish() egasini tekshirmaydi, tool tekshiradi', () => {
  it("o'qituvchi BOSHQANING testini e'lon qila olmaydi (prepare ham, execute ham), o'zinikini qila oladi", async () => {
    const foreign = { id: ID('t'), title: 'Begona', status: 'DRAFT', createdById: 'teacher-B-id', deletedAt: null };
    const { tool, tests } = build({ data: { testBrief: jest.fn().mockResolvedValue(foreign) } });
    const t = tool('publish_test');
    await expect(t.prepare(teacher, { testId: ID('t') })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.execute(teacher, { testId: ID('t') })).rejects.toBeInstanceOf(ForbiddenException); // tasdiq vaqtida ham
    expect(tests.publish).not.toHaveBeenCalled();

    const own = build({ data: { testBrief: jest.fn().mockResolvedValue({ ...foreign, createdById: 'teacher-A-id' }) } });
    await own.tool('publish_test').execute(teacher, { testId: ID('t') });
    expect(own.tests.publish).toHaveBeenCalledWith(ID('t'), 'teacher-A-id', 'TEACHER');
  });

  it("admin hamma testni e'lon qila oladi; allaqachon e'lon qilingan bo'lsa 400; o'chirilgan test 404", async () => {
    const draft = { id: ID('t'), title: 'T', status: 'DRAFT', createdById: 'teacher-B-id', deletedAt: null };
    const a = build({ data: { testBrief: jest.fn().mockResolvedValue(draft) } });
    await expect(a.tool('publish_test').prepare(admin, { testId: ID('t') })).resolves.toMatchObject({ summary: '"T" testini e\'lon qilish' });
    const pub = build({ data: { testBrief: jest.fn().mockResolvedValue({ ...draft, status: 'PUBLISHED' }) } });
    await expect(pub.tool('publish_test').prepare(admin, { testId: ID('t') })).rejects.toBeInstanceOf(BadRequestException);
    const del = build({ data: { testBrief: jest.fn().mockResolvedValue({ ...draft, deletedAt: new Date() }) } });
    await expect(del.tool('publish_test').prepare(admin, { testId: ID('t') })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('adjust_student_score (faqat admin)', () => {
  const ok = { studentId: ID('s'), amount: -20, reason: 'Nusxa ko\'chirgan' };

  it("kartochka: hozirgi → yangi ball ko'rsatiladi; bajarishda sabab AI belgisi bilan servisga o'tadi", async () => {
    const { tool, students } = build();
    const t = tool('adjust_student_score');
    const p = await t.prepare(admin, t.parse(ok));
    expect(p.summary).toBe("Ali Valiyev ballini -20 ga o'zgartirish");
    expect(p.details).toEqual([
      { label: "O'quvchi", value: 'Ali Valiyev' }, { label: 'Hozirgi ball', value: '250' }, { label: "O'zgarish", value: '-20' }, { label: 'Yangi ball', value: '230' }, { label: 'Sabab', value: "Nusxa ko'chirgan" },
    ]);
    expect(t.risk).toBe('HIGH');
    await t.execute(admin, t.parse(ok));
    expect(students.adjustScore).toHaveBeenCalledWith(ID('s'), { amount: -20, reason: "Nusxa ko'chirgan (AI yordamchi orqali)" }, 'admin-1-id');
  });

  it(`chegaralar: nol, ±${MAX_SCORE_ADJUST} dan katta, kasr, sababsiz/juda qisqa sabab rad etiladi`, () => {
    const t = build().tool('adjust_student_score');
    expect(() => t.parse({ ...ok, amount: 0 })).toThrow(/nolga/);
    expect(() => t.parse({ ...ok, amount: MAX_SCORE_ADJUST + 1 })).toThrow(ToolInputError);
    expect(() => t.parse({ ...ok, amount: -(MAX_SCORE_ADJUST + 1) })).toThrow(ToolInputError);
    expect(() => t.parse({ ...ok, amount: 1.5 })).toThrow(ToolInputError);
    expect(() => t.parse({ ...ok, reason: 'ha' })).toThrow(/qisqa/);
    expect(() => t.parse({ studentId: ok.studentId, amount: 5 })).toThrow(/reason/);
    expect(t.parse({ ...ok, amount: MAX_SCORE_ADJUST }).amount).toBe(MAX_SCORE_ADJUST);
  });

  it("ball manfiy bo'lib qolsa yoki profil yo'q bo'lsa taklif yaratilmaydi", async () => {
    const t = build().tool('adjust_student_score');
    await expect(t.prepare(admin, { ...ok, amount: -300 })).rejects.toThrow(/manfiy/);
    const noProfile = build({ students: { getDetail: jest.fn().mockResolvedValue({ firstName: 'A', lastName: null, status: 'ACTIVE', studentProfile: null }) } });
    await expect(noProfile.tool('adjust_student_score').prepare(admin, ok)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("faqat ADMIN roliga tegishli", () => {
    const { tool } = build();
    expect(tool('adjust_student_score').roles).toEqual(['ADMIN']);
    expect(tool('set_student_blocked').roles).toEqual(['ADMIN']);
    expect(tool('assign_test').roles).toEqual(['TEACHER', 'ADMIN']);
  });
});

describe('set_student_blocked (faqat admin)', () => {
  it("holatga mos kartochka; allaqachon shu holatda bo'lsa taklif yaratilmaydi", async () => {
    const { tool, students } = build();
    const t = tool('set_student_blocked');
    const p = await t.prepare(admin, t.parse({ studentId: ID('s'), blocked: true }));
    expect(p.summary).toBe('Ali Valiyev ni bloklash');
    expect(p.details).toContainEqual({ label: 'Oqibat', value: 'Ilovaga kira olmaydi' });
    await t.execute(admin, { studentId: ID('s'), blocked: true });
    expect(students.setBlocked).toHaveBeenCalledWith(ID('s'), true, 'admin-1-id');

    await expect(t.prepare(admin, { studentId: ID('s'), blocked: false })).rejects.toThrow('bloklanmagan'); // ACTIVE edi
    const blockedAlready = build({ students: { getDetail: jest.fn().mockResolvedValue({ firstName: 'A', lastName: null, status: 'BLOCKED', studentProfile: {} }) } });
    await expect(blockedAlready.tool('set_student_blocked').prepare(admin, { studentId: ID('s'), blocked: true })).rejects.toThrow('allaqachon bloklangan');
  });

  it("'blocked' aniq mantiqiy qiymat bo'lishi shart (\"false\" matni emas)", () => {
    const t = build().tool('set_student_blocked');
    expect(() => t.parse({ studentId: ID('s'), blocked: 'false' })).toThrow(ToolInputError);
    expect(() => t.parse({ studentId: ID('s') })).toThrow(ToolInputError);
  });
});
