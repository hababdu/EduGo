import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

/** ISO hafta kunlari: 1=Dushanba … 7=Yakshanba */
export const WEEKDAYS: { n: number; short: string; full: string }[] = [
  { n: 1, short: 'Du', full: 'Dushanba' },
  { n: 2, short: 'Se', full: 'Seshanba' },
  { n: 3, short: 'Cho', full: 'Chorshanba' },
  { n: 4, short: 'Pa', full: 'Payshanba' },
  { n: 5, short: 'Ju', full: 'Juma' },
  { n: 6, short: 'Sha', full: 'Shanba' },
  { n: 7, short: 'Ya', full: 'Yakshanba' },
];

export interface GroupSchedule {
  lessonDays?: number[] | null;
  lessonStartTime?: string | null;
  lessonEndTime?: string | null;
  room?: string | null;
}

export interface TodayLesson {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  teacher: { id: string; firstName: string; lastName: string | null } | null;
  membersCount: number;
  /** Bugun davomati belgilangan o'quvchilar soni (o'quvchi uchun har doim 0) */
  markedCount: number;
}

export const hasSchedule = (s: GroupSchedule) => !!s.lessonDays && s.lessonDays.length > 0;

/** "Du · Cho · Ju" */
export function formatDays(days?: number[] | null): string {
  if (!days || days.length === 0) return '';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.n === d)?.short)
    .filter(Boolean)
    .join(' · ');
}

/** "09:00–10:30" yoki "09:00" */
export function formatTime(start?: string | null, end?: string | null): string {
  if (!start) return '';
  return end ? `${start}–${end}` : start;
}

/** Bitta qatorli qisqa ko'rinish: "Du · Cho · Ju · 09:00–10:30 · 3-xona" */
export function formatSchedule(s: GroupSchedule): string {
  return [formatDays(s.lessonDays), formatTime(s.lessonStartTime, s.lessonEndTime), s.room]
    .filter((x) => !!x)
    .join(' · ');
}

export function useTodayLessons() {
  return useQuery({
    queryKey: ['groups', 'schedule', 'today'],
    queryFn: () => apiFetch<TodayLesson[]>('/api/v1/groups/schedule/today'),
    staleTime: 60_000,
  });
}
