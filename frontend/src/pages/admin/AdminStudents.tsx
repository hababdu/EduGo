import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStudents } from '../../hooks/useAdmin';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Faol',
  BLOCKED: 'Bloklangan',
  PENDING: 'Kutilmoqda',
};

export function AdminStudents() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useAdminStudents({ search, status: status || undefined, page });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-6">Studentlar</h1>

      <div className="flex gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Ism yoki username bo'yicha qidirish"
          className="flex-1 bg-surface rounded-lg px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-surface rounded-lg px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Barchasi</option>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
        </select>
      </div>

      {isLoading && !data ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">
          Bu qidiruvga mos student topilmadi.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {data?.items.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/admin/students/${s.id}`)}
              className="w-full flex items-center justify-between py-3.5 text-left hover:bg-surface/50 px-2 -mx-2 rounded-lg transition-colors"
            >
              <div>
                <p className="text-sm font-medium">
                  {s.firstName} {s.lastName ?? ''}
                </p>
                <p className="text-xs text-ink-muted">
                  {s.username ? `@${s.username}` : 'username yo\'q'} ·{' '}
                  {STATUS_LABELS[s.status]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{s.totalScore}</p>
                <p className="text-xs text-ink-muted">{s.level}-daraja</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-surface disabled:opacity-30"
          >
            Oldingi
          </button>
          <span className="text-sm text-ink-muted self-center">
            {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-surface disabled:opacity-30"
          >
            Keyingi
          </button>
        </div>
      )}
    </div>
  );
}
