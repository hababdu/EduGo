import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../../components/ui/Toast';

export interface School { id: string; name: string; city: string | null; about: string | null; posterUrl?: string | null; websiteUrl?: string | null; telegramUrl?: string | null; instagramUrl?: string | null; ratingAvg: number; ratingCount: number }
export interface SchoolDetail extends School { subjects: string[]; breakdown: Record<string, number>; reviews: { rating: number; comment: string | null; createdAt: string; author: string }[] }
export interface Catalog { total: number; page: number; pages: number; items: School[] }
export interface MyMembership { id: string; role: string; status: string; requestedAt: string; isActive?: boolean; organization: { id: string; name: string } }
export interface MyTrial { id: string; status: string; preferredAt: string | null; scheduledAt: string | null; decisionNote: string | null; organization: { id: string; name: string }; group: { name: string } | null; student: { id: string; name: string } }
export interface Slot { id: string; weekday: number; startTime: string; endTime: string; room: string | null; startsOn?: string | null; endsOn?: string | null; subject: string; group: { id: string; name: string }; teacher: { id: string; name: string } }
export interface ScheduleSessionRow { id: string; title: string; sessionType: string; teacherId: string; studentId: string | null; groupId: string | null; startsAt: string; endsAt: string; room: string | null; status: string; notes: string | null }
export interface MemberRow { id: string; role: string; status: string; message: string | null; requestedAt: string; user: { id: string; name: string; username: string | null; telegramId: string } }
export interface Paged<T> { total: number; page: number; pages: number; items: T[] }
export interface TrialRow { id: string; status: string; preferredAt: string | null; scheduledAt: string | null; note: string | null; decisionNote: string | null; createdAt: string; group: { id: string; name: string } | null; student: { id: string; name: string; username: string | null }; requestedByParent: boolean }
export interface AssignmentRow { id: string; teacher: { id: string; name: string }; subject: { id: string; name: string }; group: { id: string; name: string }; slots: number }
export interface InvoiceRow { id: string; month: string; amount: number; status: string; paidAt: string | null }

export const ROLE_UZ: Record<string, string> = { STUDENT: "O'quvchi", TEACHER: "O'qituvchi", ADMIN: 'Admin' };
export const TRIAL_UZ: Record<string, { l: string; c: string }> = {
  REQUESTED: { l: 'Kutilmoqda', c: 'bg-gold/15 text-gold' },
  APPROVED: { l: 'Tasdiqlandi', c: 'bg-sky/15 text-sky' },
  DECLINED: { l: 'Rad etildi', c: 'bg-coral/15 text-coral' },
  ATTENDED: { l: 'Qatnashdi', c: 'bg-teal/15 text-teal' },
  NO_SHOW: { l: 'Kelmadi', c: 'bg-coral/15 text-coral' },
  CANCELLED: { l: 'Bekor qilindi', c: 'bg-tint/10 text-ink-muted' },
  ADMITTED: { l: 'Qabul qilindi', c: 'bg-teal/25 text-teal' },
};
export const MEMBER_UZ: Record<string, { l: string; c: string }> = {
  PENDING: { l: 'Kutilmoqda', c: 'bg-gold/15 text-gold' },
  ACTIVE: { l: 'Faol', c: 'bg-teal/15 text-teal' },
  REJECTED: { l: 'Rad etildi', c: 'bg-coral/15 text-coral' },
  REMOVED: { l: 'Chiqarilgan', c: 'bg-tint/10 text-ink-muted' },
};
export const DAYS = ['', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
export const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—');
export const money = (n: number) => `${n.toLocaleString('uz-UZ')} so'm`;
export const inputCls = 'min-h-[44px] w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60';

export const useSchoolQuery = <T,>(key: unknown[], url: string, enabled = true) =>
  useQuery({ queryKey: ['school', ...key], queryFn: () => apiFetch<T>(url), enabled, placeholderData: (p) => p });

/** Yozuvchi so'rov: muvaffaqiyatda `school` keshini yangilaydi, xatoda toast chiqaradi. */
export function useSchoolAction<V>(fn: (v: V) => Promise<unknown>, okMsg?: string, onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { if (okMsg) toast('success', okMsg); qc.invalidateQueries({ queryKey: ['school'] }); onDone?.(); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
}
export const post = (url: string, data?: unknown) => apiFetch(url, { method: 'POST', data: data as any });
export const patch = (url: string, data?: unknown) => apiFetch(url, { method: 'PATCH', data: data as any });
export const del = (url: string) => apiFetch(url, { method: 'DELETE' });

export function Chip({ s }: { s: { l: string; c: string } }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.c}`}>{s.l}</span>;
}
