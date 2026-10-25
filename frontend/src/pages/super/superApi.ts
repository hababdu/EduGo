import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../../components/ui/Toast';

const b = '/api/v1/super';

export interface Overview {
  organizations: { active: number; suspended: number };
  users: { total: number; roles: Record<string, number>; active7d: number };
  groups: number; tests: number;
  files: { count: number; bytes: number };
  aiToday: { requests: number; tokens: number };
}
export interface Org {
  id: string; name: string; status: 'ACTIVE' | 'SUSPENDED'; note: string | null; createdAt: string;
  users: number; groups: number; storageChatId: string | null;
  admins: { id: string; name: string; username: string | null; telegramId: string }[];
}
export interface AdminRow {
  id: string; name: string; username: string | null; telegramId: string; role: string; status: string;
  lastActiveAt: string; organization: { id: string; name: string } | null;
}
export type AiProviderId = 'gemini' | 'groq' | 'anthropic';
export interface AiInfo {
  settings: { enabled: boolean; limits: Record<string, number>; primary: AiProviderId; fallback: AiProviderId | null; models: Record<AiProviderId, { fast: string; smart: string }> };
  provider: {
    primary: AiProviderId; fallback: AiProviderId | null;
    configured: Record<AiProviderId, boolean>; active: AiProviderId[];
    defaults: Record<AiProviderId, { fast: string; smart: string }>;
  };
  topToday: { userId: string | null; name: string; role: string | null; requests: number; tokens: number }[];
  features: { feature: string; requests: number; tokens: number }[];
  days: { date: string; tokens: number }[];
}
export interface AuditPage {
  total: number; page: number; pages: number; actions: string[];
  items: { id: string; action: string; targetType: string; targetId: string; oldValue: unknown; newValue: unknown; createdAt: string; actor: { name: string; role: string } }[];
}
export interface SystemInfo {
  server: { uptimeSec: number; node: string; rssMb: number; heapMb: number; env: string };
  db: { ok: boolean; latencyMs: number; sizeBytes: number | null };
  config: Record<string, boolean | number>;
  queue: { gradingRunning: number; gradingOverdue: number; failedSubmissions: number; needsReview: number; orphanFiles: number };
}

export const useSuperOverview = () => useQuery({ queryKey: ['super', 'overview'], queryFn: () => apiFetch<Overview>(`${b}/overview`) });
export const useSuperSystem = () => useQuery({ queryKey: ['super', 'system'], queryFn: () => apiFetch<SystemInfo>(`${b}/system`), refetchInterval: 30_000 });
export const useSuperOrgs = () => useQuery({ queryKey: ['super', 'orgs'], queryFn: () => apiFetch<Org[]>(`${b}/organizations`) });
export interface Candidate { id: string; name: string; username: string | null; role: string; organization: { id: string; name: string } | null }
export const useCandidates = (search: string, enabled: boolean) =>
  useQuery({
    queryKey: ['super', 'candidates', search],
    queryFn: () => apiFetch<Candidate[]>(`${b}/users?search=${encodeURIComponent(search)}`),
    enabled,
    placeholderData: (p) => p,
  });
export const useSuperAdmins = () => useQuery({ queryKey: ['super', 'admins'], queryFn: () => apiFetch<AdminRow[]>(`${b}/admins`) });
export const useSuperAi = () => useQuery({ queryKey: ['super', 'ai'], queryFn: () => apiFetch<AiInfo>(`${b}/ai`) });
export const useSuperAudit = (page: number, action: string) =>
  useQuery({
    queryKey: ['super', 'audit', page, action],
    queryFn: () => apiFetch<AuditPage>(`${b}/audit?page=${page}${action ? `&action=${encodeURIComponent(action)}` : ''}`),
    placeholderData: (p) => p,
  });

/** Yozuvchi so'rov: muvaffaqiyatda `super` keshini yangilaydi, xatoda toast chiqaradi */
export function useSuperMutation<V>(fn: (v: V) => Promise<unknown>, okMsg?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { if (okMsg) toast('success', okMsg); qc.invalidateQueries({ queryKey: ['super'] }); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
}
export const sapi = {
  createOrg: (v: { name: string; note?: string; storageChatId: string }) => apiFetch(`${b}/organizations`, { method: 'POST', body: JSON.stringify(v) }),
  updateOrg: (v: { id: string; name?: string; note?: string; status?: string; monthlyPlanFee?: number | null; storageChatId?: string }) => { const { id, ...rest } = v; return apiFetch(`${b}/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(rest) }); },
  assignAdmin: (v: { orgId: string; userId: string }) => apiFetch(`${b}/organizations/${v.orgId}/admins`, { method: 'POST', body: JSON.stringify({ userId: v.userId }) }),
  removeAdmin: (v: { orgId: string; userId: string }) => apiFetch(`${b}/organizations/${v.orgId}/admins/${v.userId}`, { method: 'DELETE' }),
  markBilling: (v: { orgId: string; month: string; status: SubState; amount?: number; note?: string }) => { const { orgId, ...rest } = v; return apiFetch(`${b}/billing/${orgId}`, { method: 'PUT', body: JSON.stringify(rest) }); },
  backupOrg: (id: string) => apiFetch(`${b}/organizations/${id}/backup`, { method: 'POST' }),
  restoreOrg: (v: { id: string; file: File; apply: boolean }) => {
    const form = new FormData();
    form.append('file', v.file);
    return apiFetch<RestoreResult>(`${b}/organizations/${v.id}/restore${v.apply ? '?apply=1' : ''}`, { method: 'POST', body: form });
  },
  moveAdmin: (v: { userId: string; organizationId: string }) => apiFetch(`${b}/admins/${v.userId}/organization`, { method: 'PATCH', body: JSON.stringify({ organizationId: v.organizationId }) }),
  block: (v: { id: string; blocked: boolean }) => apiFetch(`${b}/users/${v.id}/block`, { method: 'PATCH', body: JSON.stringify({ blocked: v.blocked }) }),
  saveAi: (v: { enabled?: boolean; limits?: Record<string, number>; primary?: AiProviderId; fallback?: AiProviderId | 'none'; models?: Partial<Record<AiProviderId, { fast?: string; smart?: string }>> }) => apiFetch(`${b}/ai`, { method: 'PUT', body: JSON.stringify(v) }),
};

export interface RestoreResult { dryRun: boolean; backupCreatedAt: string | null; toRestore: { groups: number; members: number; payments: number; attendance: number } }
export type SubState = 'PAID' | 'WAIVED' | 'UNPAID';
export interface BillingOverview {
  month: string;
  items: { orgId: string; name: string; orgStatus: 'ACTIVE' | 'SUSPENDED'; fee: number | null; state: SubState; amount: number; note: string | null; paidAt: string | null }[];
  totals: { paid: number; waived: number; unpaid: number; collected: number; expected: number };
}
export interface OrgDetail {
  org: { id: string; name: string; status: 'ACTIVE' | 'SUSPENDED'; note: string | null; monthlyPlanFee: number | null; storageChatId: string | null; lastBackupAt: string | null; lastBackupStatus: string | null; createdAt: string };
  counts: { students: number; teachers: number; admins: number; groups: number };
  admins: { id: string; name: string; username: string | null; telegramId: string; status: string; lastActiveAt: string }[];
  teachers: { id: string; name: string; username: string | null; status: string }[];
  groups: { id: string; name: string; fee: number | null; members: number; teacher: string | null }[];
  studentPayments: { month: string; collected: number; paidCount: number; expected: number };
  subscription: { currentMonth: string; state: SubState; history: { month: string; state: SubState; amount: number; paidAt: string }[] };
}
export const useBilling = (month: string) => useQuery({ queryKey: ['super', 'billing', month], queryFn: () => apiFetch<BillingOverview>(`${b}/billing?month=${month}`), placeholderData: (p) => p });
export const useOrgDetail = (id: string) => useQuery({ queryKey: ['super', 'org', id], queryFn: () => apiFetch<OrgDetail>(`${b}/organizations/${id}/detail`), enabled: !!id });

export const num = (n: number) => n.toLocaleString('uz-UZ');
export const when = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
export const ROLE_UZ: Record<string, string> = { STUDENT: 'Talaba', TEACHER: "O'qituvchi", ADMIN: 'Admin', SUPER_ADMIN: 'Super admin' };
