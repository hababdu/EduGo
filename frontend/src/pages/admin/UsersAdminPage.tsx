import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../lib/api-client';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

export interface User {
  id: string;
  telegramId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role: UserRole;
}

export default function UsersAdminPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await apiFetch<User[]>('/api/v1/users');
      setUsers(data);
      setErrorMessage(null);
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string): Promise<void> => {
    setUpdatingId(userId);
    try {
      await apiFetch(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      const error = err as Error;
      alert('Xatolik yuz berdi: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.telegramId.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <h3 className="font-display text-lg text-coral">⚠️ Ma'lumotni yuklab bo'lmadi</h3>
        <p className="text-sm text-ink">{errorMessage}</p>
        <p className="text-xs text-ink-muted">Tizimga admin sifatida kirganingizni va xotirada token mavjudligini tekshiring.</p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-surface rounded-xl text-sm border border-white/10 hover:bg-white/5 transition-colors text-ink"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Foydalanuvchilar Rollari</h1>
          <p className="text-xs text-ink-muted mt-1">Jami: {users.length} ta foydalanuvchi</p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-xs px-3 py-1.5 rounded-xl bg-surface border border-white/10 hover:bg-white/5 transition-colors text-ink"
        >
          🔄 Yangilash
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ism, username yoki Telegram ID bo'yicha qidirish..."
        className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-gold border border-white/5"
      />

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-surface/20">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-surface/40 text-ink-muted text-xs uppercase tracking-wider">
              <th className="p-4">Foydalanuvchi</th>
              <th className="p-4">Joriy Rol</th>
              <th className="p-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-ink-muted text-sm">
                  Foydalanuvchilar topilmadi
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-ink">
                      {u.firstName || '—'} {u.lastName || ''}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-2">
                      <span>{u.username ? `@${u.username}` : 'username yo\'q'}</span>
                      <span>·</span>
                      <code className="text-[11px] text-ink-faint">ID: {u.telegramId}</code>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-coral/20 text-coral'
                          : u.role === 'TEACHER'
                          ? 'bg-teal/20 text-teal'
                          : 'bg-surface text-ink-muted'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/10 cursor-pointer text-ink disabled:opacity-50"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}