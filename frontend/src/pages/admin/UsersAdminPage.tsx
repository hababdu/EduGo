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

const API_BASE_URL: string = ('https://edugo-5h4d.onrender.com' as string) ;

export default function UsersAdminPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  // Foydalanuvchilar ro'yxatini olish API so'rovi
  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Xatolik: ${res.status} - ${errorText}`);
      }
      
      const data: User[] = await res.json();
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

  // Rolni o'zgartirish API so'rovi (PATCH /api/v1/users/:id/role)
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

      if (!res.ok) {
        const errData = await res.text();
        throw new Error(`Rolni o'zgartirib bo'lmadi: ${errData}`);
      }

      // Lokal holatni darhol yangilash
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
    return <div style={{ padding: '24px', color: '#fff' }}>Yuklanmoqda...</div>;
  }

  if (errorMessage) {
    return (
      <div style={{ padding: '24px', color: '#f87171', fontFamily: 'sans-serif' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Ma'lumotni yuklab bo'lmadi</h3>
        <p>{errorMessage}</p>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
          Token mavjudligini va ADMIN huquqingiz borligini tekshiring.
        </p>
        <button 
          onClick={fetchUsers}
          style={{ marginTop: '12px', padding: '8px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
          ⚙️ Admin Panel — Foydalanuvchilar Rollari
        </h2>
        <button 
          onClick={fetchUsers}
          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
        >
          🔄 Yangilash
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              <th style={{ padding: '12px' }}>Foydalanuvchi</th>
              <th style={{ padding: '12px' }}>Telegram ID</th>
              <th style={{ padding: '12px' }}>Joriy Rol</th>
              <th style={{ padding: '12px' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                  Foydalanuvchilar topilmadi
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: '#fff' }}>{u.firstName || '—'} {u.lastName || ''}</strong>
                    {u.username && <div style={{ color: '#9ca3af', fontSize: '12px' }}>@{u.username}</div>}
                  </td>
                  <td style={{ padding: '12px' }}><code style={{ color: '#d1d5db' }}>{u.telegramId}</code></td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'TEACHER' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: u.role === 'ADMIN' ? '#f87171' : u.role === 'TEACHER' ? '#818cf8' : '#e5e7eb',
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
                        border: '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: '#1f2937',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
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