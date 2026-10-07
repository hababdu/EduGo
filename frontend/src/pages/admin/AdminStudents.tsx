import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStudents } from '../../hooks/useAdmin';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { Users, Search } from '../../design/icons';

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

  const inputCls =
    'bg-surface/50 rounded-2xl px-4 py-3 text-sm outline-none border border-white/10 text-ink min-h-[44px] focus:border-gold/50';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      <StaffHero
        eyebrow="ADMIN · TALABALAR"
        title="Studentlar"
        subtitle={data?.total ? `Jami: ${data.total} ta talaba` : "Talabalar ro'yxati va boshqaruvi"}
        image={IMAGES.hero}
        accent="sky"
        actions={
          hasActiveFilters ? (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-gold bg-gold/10 px-3.5 py-2 rounded-xl active:scale-[0.98] transition"
            >
              Filtrlarni tozalash
            </button>
          ) : undefined
        }
      />

      {/* Qidiruv, status va saralash */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Ism yoki username..."
            className={`${inputCls} w-full pl-10 placeholder:text-ink-faint`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="">Barcha statuslar</option>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className={`${inputCls} cursor-pointer`}>
          <option value="score_desc">Ko'p ball (yuqoriga)</option>
          <option value="score_asc">Kam ball (pastga)</option>
          <option value="level">Daraja bo'yicha</option>
        </select>
      </div>

      {isLoading && !data ? (
        <div className="space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[72px] bg-surface/40 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 bg-surface/30 rounded-3xl border border-white/10 space-y-3">
          <p className="text-sm text-ink-muted">Bu qidiruvga mos student topilmadi.</p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs bg-gold text-base font-semibold px-4 py-2 rounded-xl active:scale-[0.98] transition"
            >
              Barcha filtrlarni olib tashlash
            </button>
          )}
        </div>
      ) : (
        <Panel title="Talabalar" icon={Users} accent="sky" flush>
          <div className="divide-y divide-white/5">
            {sortedItems.map((s, idx) => {
              const isBlocked = s.status === 'BLOCKED';
              const name = `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Student';
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/admin/students/${s.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors group"
                >
                  <span className="w-5 text-center text-[11px] font-semibold text-ink-faint tabular-nums">
                    {(page - 1) * 20 + idx + 1}
                  </span>
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">{name}</p>
                    <p className="text-xs text-ink-muted flex items-center gap-2 mt-0.5 min-w-0">
                      <span className="truncate">{s.username ? `@${s.username}` : "username yo'q"}</span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                          isBlocked ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'
                        }`}
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums text-gold">{s.totalScore}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">{s.level}-daraja</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs font-medium px-4 py-2.5 rounded-xl bg-surface/50 border border-white/10 disabled:opacity-30 active:scale-[0.98] transition"
          >
            ← Oldingi
          </button>
          <span className="text-xs text-ink-muted tabular-nums">
            {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs font-medium px-4 py-2.5 rounded-xl bg-surface/50 border border-white/10 disabled:opacity-30 active:scale-[0.98] transition"
          >
            Keyingi →
          </button>
        </div>
      )}
    </div>
  );
}
