import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface AttendanceDayStudent {
  studentId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  status: AttendanceStatus | null;
  note: string | null;
}
export interface AttendanceDay {
  groupId: string;
  date: string;
  students: AttendanceDayStudent[];
  markedCount: number;
}
export interface AttendanceSummary {
  groupId: string;
  days: number;
  overallPercent: number | null;
  students: {
    studentId: string;
    firstName: string;
    lastName: string | null;
    present: number;
    absent: number;
    excused: number;
    percent: number | null;
  }[];
}
export interface MyAttendance {
  groupId: string;
  days: number;
  present: number;
  absent: number;
  excused: number;
  percent: number | null;
  recent: { date: string; status: AttendanceStatus }[];
}

/** Toshkent bo'yicha bugun (YYYY-MM-DD) — backend bilan bir xil qoida (UTC+5) */
export function tashkentToday(now: number = Date.now()): string {
  return new Date(now + 5 * 3_600_000).toISOString().slice(0, 10);
}
export function shiftDate(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function useAttendanceDay(groupId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', groupId, 'day', date],
    queryFn: () => apiFetch<AttendanceDay>(`/api/v1/groups/${groupId}/attendance?date=${date}`),
    enabled: !!groupId && !!date,
  });
}

export function useAttendanceSummary(groupId: string, days = 30) {
  return useQuery({
    queryKey: ['attendance', groupId, 'summary', days],
    queryFn: () => apiFetch<AttendanceSummary>(`/api/v1/groups/${groupId}/attendance/summary?days=${days}`),
    enabled: !!groupId,
    staleTime: 60_000,
  });
}

export function useMyAttendance(groupId: string) {
  return useQuery({
    queryKey: ['attendance', groupId, 'me'],
    queryFn: () => apiFetch<MyAttendance>(`/api/v1/groups/${groupId}/attendance/me`),
    enabled: !!groupId,
    staleTime: 60_000,
    retry: false,
  });
}

export function useMarkAttendance(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; records: { studentId: string; status: AttendanceStatus }[] }) =>
      apiFetch<{ ok: boolean; saved: number }>(`/api/v1/groups/${groupId}/attendance`, {
        method: 'PUT',
        data: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', groupId] });
    },
  });
}
