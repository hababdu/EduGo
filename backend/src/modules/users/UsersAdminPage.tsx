/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

export interface User {
  id: string;
  telegramId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role: UserRole;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchUsers = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Yuklashda xatolik');
      const data: User[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
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
      const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Rolni yangilab bo'lmadi");

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

  if (loading) {
    return <div style={{ padding: '20px' }}>Yuklanmoqda...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
        ⚙️ Admin Panel — Foydalanuvchilar Rollari
      </h2>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Foydalanuvchi</th>
              <th style={{ padding: '12px' }}>Telegram ID</th>
              <th style={{ padding: '12px' }}>Joriy Rol</th>
              <th style={{ padding: '12px' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>
                  <strong>{u.firstName || '—'} {u.lastName || ''}</strong>
                  {u.username && <div style={{ color: '#6b7280', fontSize: '12px' }}>@{u.username}</div>}
                </td>
                <td style={{ padding: '12px' }}><code>{u.telegramId}</code></td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'TEACHER' ? '#e0e7ff' : '#f3f4f6',
                    color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'TEACHER' ? '#3730a3' : '#374151',
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(u.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}