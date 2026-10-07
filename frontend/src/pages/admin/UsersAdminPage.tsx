import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../lib/api-client';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { Users, Search, RefreshCw } from '../../design/icons';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

export interface User {
  id: string;
  telegramId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role: UserRole;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Talaba',
  TEACHER: "O'qituvchi",
  ADMIN: 'Admin',
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-coral/15 text-coral',
  TEACHER: 'bg-teal/15 text-teal',
  STUDENT: 'bg-white/5 text-ink-muted',
};

type Filter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN';

export default function UsersAdminPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await apiFetch<User[]>('/api/v1/users');
      setUsers(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string): Promise<void> => {
    setUpdatingId(userId);
    setActionError(null);
    try {
      await apiFetch(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setActionError('Rolni o\'zgartirib bo\'lmadi: ' + (err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: users.length, STUDENT: 0, TEACHER: 0, ADMIN: 0 };
    users.forEach((u) => {
      if (u.role in c) c[u.role as 'STUDENT' | 'TEACHER' | 'ADMIN']++;
    });
    return c;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== 'ALL' && u.role !== filter) return false;
      if (!q) return true;
      return (
        (u.firstName ?? '').toLowerCase().includes(q) ||
        (u.lastName ?? '').toLowerCase().includes(q) ||
        (u.username ?? '').toLowerCase().includes(q) ||
        u.telegramId.toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  if (loading && users.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface/50 rounded-2xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-3">
        <h3 className="font-display text-lg text-coral">Ma'lumotni yuklab bo'lmadi</h3>
        <p className="text-sm text-ink">{errorMessage}</p>
        <p className="text-xs text-ink-muted">Admin sifatida kirganingizni tekshiring.</p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-surface rounded-xl text-sm border border-white/10 hover:bg-white/5 text-ink"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const chips: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'Hammasi' },
    { key: 'STUDENT', label: 'Talabalar' },
    { key: 'TEACHER', label: "O'qituvchilar" },
    { key: 'ADMIN', label: 'Adminlar' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      <StaffHero
        eyebrow="ADMIN · FOYDALANUVCHILAR"
        title="Foydalanuvchilar"
        subtitle={`Jami ${users.length} ta foydalanuvchi · rollarni shu yerdan boshqaring`}
        image={IMAGES.hero}
        accent="gold"
        actions={
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold/10 px-3.5 py-2 rounded-xl active:scale-[0.98] transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Yangilash
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism, username yoki Telegram ID..."
          className="w-full bg-surface/50 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none border border-white/10 text-ink min-h-[44px] focus:border-gold/50 placeholder:text-ink-faint"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold border transition ${
              filter === c.key
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-surface/40 border-white/10 text-ink-muted hover:text-ink'
            }`}
          >
            {c.label} <span className="opacity-70">{counts[c.key]}</span>
          </button>
        ))}
      </div>

      {actionError && (
        <div role="alert" className="rounded-2xl border border-coral/30 bg-coral/10 text-coral text-xs px-4 py-3">
          {actionError}
        </div>
      )}

      <Panel title="Ro'yxat" icon={Users} accent="coral" flush>
        {filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-ink-muted text-sm">Foydalanuvchilar topilmadi</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredUsers.map((u) => {
              const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username || 'Nomsiz';
              return (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink truncate">{name}</div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {u.username ? `@${u.username}` : "username yo'q"} · ID {u.telegramId}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ROLE_BADGE[u.role] ?? ROLE_BADGE.STUDENT}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      aria-label={`${name} roli`}
                      className="bg-surface/60 text-[11px] rounded-lg px-2 py-1.5 outline-none border border-white/10 cursor-pointer text-ink disabled:opacity-50"
                    >
                      <option value="STUDENT">Talaba</option>
                      <option value="TEACHER">O'qituvchi</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
