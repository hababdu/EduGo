import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { tashkentToday } from './useAttendance';

export type PaymentState = 'PAID' | 'WAIVED' | 'UNPAID';

export interface PaymentTotals {
  paid: number;
  waived: number;
  unpaid: number;
  collected: number;
  expected: number | null;
}
export interface PaymentsOverview {
  month: string;
  totals: { collected: number; expected: number; paid: number; waived: number; unpaid: number };
  groups: ({ groupId: string; name: string; monthlyFee: number | null; membersCount: number } & PaymentTotals)[];
  debtors: { studentId: string; name: string; username: string | null; groupId: string; groupName: string; monthlyFee: number | null }[];
}
export interface GroupPaymentStudent {
  studentId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  status: PaymentState;
  amount: number;
  note: string | null;
  paidAt: string | null;
  /** false: oy tugagach guruhga qo'shilgan — shu oy uchun to'lov talab qilinmaydi */
  due: boolean;
}
export interface GroupPayments {
  groupId: string;
  name: string;
  month: string;
  monthlyFee: number | null;
  students: GroupPaymentStudent[];
  totals: PaymentTotals;
}
export interface MyPayments {
  groupId: string;
  monthlyFee: number | null;
  months: { month: string; status: PaymentState }[];
}

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export const currentMonth = () => tashkentToday().slice(0, 7);
export const monthLabel = (m: string) => `${UZ_MONTHS[Number(m.slice(5, 7)) - 1] ?? m} ${m.slice(0, 4)}`;
export function shiftMonth(m: string, delta: number): string {
  const idx = Number(m.slice(0, 4)) * 12 + (Number(m.slice(5, 7)) - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}
/** 1 250 000 so'm */
export const formatMoney = (n: number | null | undefined) =>
  n == null ? '—' : `${Math.round(n).toLocaleString('uz-UZ').replace(/,/g, ' ')} so'm`;

export function usePaymentsOverview(month: string) {
  return useQuery({
    queryKey: ['payments', 'overview', month],
    queryFn: () => apiFetch<PaymentsOverview>(`/api/v1/payments/overview?month=${month}`),
  });
}
export function useGroupPayments(groupId: string, month: string) {
  return useQuery({
    queryKey: ['payments', 'group', groupId, month],
    queryFn: () => apiFetch<GroupPayments>(`/api/v1/payments/group/${groupId}?month=${month}`),
    enabled: !!groupId,
  });
}
export function useMarkPayments(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { month: string; records: { studentId: string; status: PaymentState; amount?: number; note?: string }[] }) =>
      apiFetch(`/api/v1/payments/group/${groupId}`, { method: 'PUT', data: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
export function useMyPayments(groupId: string) {
  return useQuery({
    queryKey: ['payments', 'me', groupId],
    queryFn: () => apiFetch<MyPayments>(`/api/v1/payments/me/${groupId}`),
    enabled: !!groupId,
    staleTime: 60_000,
  });
}
