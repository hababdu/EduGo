import { useState, useMemo } from 'react';
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
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'level'>('score_desc');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useAdminStudents({ 
    search, 
    status: status || undefined, 
    page 
  });

  // Agar backend tartiblamasa, frontendda qo'shimcha saralash (agar data kelgan bo'lsa)
  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    const items = [...data.items];
    
    return items.sort((a, b) => {
      if (sortBy === 'score_desc') return (b.totalScore || 0) - (a.totalScore || 0);
      if (sortBy === 'score_asc') return (a.totalScore || 0) - (b.totalScore || 0);
      if (sortBy === 'level') return (b.level || 1) - (a.level || 1);
      return 0;
    });
  }, [data?.items, sortBy]);

  const hasActiveFilters = search.trim() !== '' || status !== '' || sortBy !== 'score_desc';

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setSortBy('score_desc');
    setPage(1);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Sarlavha va umumiy statistika */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Studentlar</h1>
          <p className="text-xs text-ink-muted mt-1">
            {data?.total ? `Jami: ${data.total} ta talaba` : 'Talabalar ro\'yxati va boshqaruvi'}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="text-xs text-gold hover:underline bg-surface/50 px-3 py-1.5 rounded-lg border border-white/5"
          >
            Filtrlarni tozalash
          </button>
        )}
      </div>

      {/* Qidiruv, Status va Saralash paneli */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Ism yoki username..."
          className="bg-surface rounded-xl px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-gold border border-white/5"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-surface rounded-xl px-3 py-2.5 text-sm outline-none border border-white/5 cursor-pointer text-ink"
        >
          <option value="">Barcha statuslar</option>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-surface rounded-xl px-3 py-2.5 text-sm outline-none border border-white/5 cursor-pointer text-ink"
        >
          <option value="score_desc">Ko'p ball (yuqoriga)</option>
          <option value="score_asc">Kam ball (pastga)</option>
          <option value="level">Daraja bo'yicha</option>
        </select>
      </div>

      {/* Kontent qismi */}
      {isLoading && !data ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 bg-surface/20 rounded-2xl border border-white/5 space-y-3">
          <p className="text-sm text-ink-muted">Bu qidiruvga mos student topilmadi.</p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs bg-gold text-base font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Barcha filtrlarni olib tashlash
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
          {sortedItems.map((s) => {
            const isBlocked = s.status === 'BLOCKED';
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/admin/students/${s.id}`)}
                className="w-full flex items-center justify-between py-4 text-left hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center font-display text-sm group-hover:border-gold/50 transition-colors">
                    {s.firstName?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-gold transition-colors">
                      {s.firstName} {s.lastName ?? ''}
                    </p>
                    <p className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                      <span>{s.username ? `@${s.username}` : 'username yo\'q'}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isBlocked ? 'bg-coral/20 text-coral' : 'bg-teal/20 text-teal'
                      }`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-gold">{s.totalScore} ball</p>
                  <p className="text-xs text-ink-muted mt-0.5">{s.level}-daraja</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs px-4 py-2 rounded-xl bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors"
          >
            ← Oldingi
          </button>
          <span className="text-xs text-ink-muted tabular-nums">
            Sahifa {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs px-4 py-2 rounded-xl bg-surface border border-white/5 disabled:opacity-30 hover:bg-white/5 transition-colors"
          >
            Keyingi →
          </button>
        </div>
      )}
    </div>
  );
}