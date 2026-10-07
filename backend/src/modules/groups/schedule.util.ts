import { BadRequestException } from '@nestjs/common';

const TZ_OFFSET_MS = 5 * 3_600_000; // Toshkent, UTC+5

/** 'YYYY-MM-DD' sananing ISO hafta kuni: 1=Dushanba … 7=Yakshanba. */
export function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Toshkent bo'yicha bugungi ISO hafta kuni. */
export function tashkentWeekday(now: Date = new Date()): number {
  return isoWeekday(new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10));
}

export interface ScheduleInput {
  lessonDays?: number[];
  lessonStartTime?: string | null;
  lessonEndTime?: string | null;
  room?: string | null;
}

/** Jadval maydonlarini tekshiradi va saqlashga tayyor (tartiblangan, noyob) ko'rinishga keltiradi. */
export function normalizeSchedule(
  input: ScheduleInput,
  current: { lessonStartTime?: string | null; lessonEndTime?: string | null } = {},
) {
  const out: Record<string, unknown> = {};
  if (input.lessonDays !== undefined) {
    out.lessonDays = [...new Set(input.lessonDays)].sort((a, b) => a - b);
  }
  if (input.lessonStartTime !== undefined) out.lessonStartTime = input.lessonStartTime || null;
  if (input.lessonEndTime !== undefined) out.lessonEndTime = input.lessonEndTime || null;
  if (input.room !== undefined) out.room = input.room?.trim() || null;

  const start = (out.lessonStartTime !== undefined ? out.lessonStartTime : current.lessonStartTime) as string | null | undefined;
  const end = (out.lessonEndTime !== undefined ? out.lessonEndTime : current.lessonEndTime) as string | null | undefined;
  if (end && !start) throw new BadRequestException('Tugash vaqtini belgilash uchun avval boshlanish vaqtini kiriting');
  if (start && end && end <= start) throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lsin");
  return out;
}
