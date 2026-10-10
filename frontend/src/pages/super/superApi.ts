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
  users: number; groups: number;
  admins: { id: string; name: string; username: string | null; telegramId: string }[];
}
export interface AdminRow {
  id: string; name: string; username: string | null; telegramId: string; role: string; status: string;
  lastActiveAt: string; organization: { id: string; name: string } | null;
}
export interface AiInfo {
  settings: { enabled: boolean; limits: Record<string, number> };
  provider: { primary: string; fallback: string | null };
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
  createOrg: (v: { name: string; note?: string }) => apiFetch(`${b}/organizations`, { method: 'POST', body: JSON.stringify(v) }),
  updateOrg: (v: { id: string; name?: string; note?: string; status?: string }) => { const { id, ...rest } = v; return apiFetch(`${b}/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(rest) }); },
  assignAdmin: (v: { orgId: string; telegramId: string }) => apiFetch(`${b}/organizations/${v.orgId}/admins`, { method: 'POST', body: JSON.stringify({ telegramId: v.telegramId }) }),
  removeAdmin: (v: { orgId: string; userId: string }) => apiFetch(`${b}/organizations/${v.orgId}/admins/${v.userId}`, { method: 'DELETE' }),
  block: (v: { id: string; blocked: boolean }) => apiFetch(`${b}/users/${v.id}/block`, { method: 'PATCH', body: JSON.stringify({ blocked: v.blocked }) }),
  saveAi: (v: { enabled?: boolean; limits?: Record<string, number> }) => apiFetch(`${b}/ai`, { method: 'PUT', body: JSON.stringify(v) }),
};

export const num = (n: number) => n.toLocaleString('uz-UZ');
export const when = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
export const ROLE_UZ: Record<string, string> = { STUDENT: 'Talaba', TEACHER: "O'qituvchi", ADMIN: 'Admin', SUPER_ADMIN: 'Super admin' };
