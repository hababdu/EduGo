import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { API_URL } from '../../lib/config';
import { getStoredRefreshToken, useAuthStore } from '../../store/auth.store';
import { Panel } from '../../components/staff';
import { CONTROL } from '../../design/tokens';

interface TeacherMembership {
  id: string;
  role: string;
  status: string;
  isActive: boolean;
  organization: { id: string; name: string };
}

export function TeacherOrganizationSwitcher() {
  const queryClient = useQueryClient();
  const memberships = useQuery({
    queryKey: ['teacher', 'organization-memberships'],
    queryFn: () => apiFetch<TeacherMembership[]>('/api/v1/memberships/mine'),
  });
  const active = (memberships.data ?? []).filter((item) => item.status === 'ACTIVE');
  const switchOrganization = useMutation({
    mutationFn: async (membershipId: string) => {
      await apiFetch('/api/v1/memberships/' + membershipId + '/activate', { method: 'POST' });
      const refreshToken = getStoredRefreshToken() || useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error('Sessiyani yangilash uchun refresh token topilmadi');
      const response = await fetch(API_URL + '/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error('Tashkilot kontekstini yangilab bo‘lmadi');
      return response.json();
    },
    onSuccess: (session) => {
      useAuthStore.getState().setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
      queryClient.invalidateQueries();
    },
  });
  if (active.length < 2) return null;
  const current = active.find((item) => item.isActive)?.id ?? '';
  return (
    <Panel title="Tashkilotlarim" icon={Users} accent="teal">
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">O‘qituvchi sifatida biriktirilgan tashkilotlaringizdan faol ish joyini tanlang.</p>
        <select className={CONTROL.input} value={current} disabled={switchOrganization.isPending} onChange={(e) => switchOrganization.mutate(e.target.value)}>
          {active.map((item) => <option key={item.id} value={item.id}>{item.organization.name} · {item.role === 'TEACHER' ? 'O‘qituvchi' : item.role}</option>)}
        </select>
        {switchOrganization.isPending && <p className="text-[11px] text-ink-muted">Tashkilot almashtirilmoqda…</p>}
      </div>
    </Panel>
  );
}
