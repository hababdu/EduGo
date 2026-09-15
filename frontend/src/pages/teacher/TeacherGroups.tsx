// src/pages/teacher/TeacherGroups.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

interface TeacherGroup {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    members?: number;
    assignments?: number;
  };
}

function useTeacherGroups() {
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: () => apiFetch<TeacherGroup[]>('/api/v1/teacher/groups'),
    staleTime: 60_000,
  });
}

export function TeacherGroups() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: groups, isLoading, error } = useTeacherGroups();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = search.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [groups, search]);

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-32">
        <div className="h-24 bg-surface/30 rounded-3xl animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
          />
        ))}
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-32">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Guruhlarni yuklashda xatolik
          </p>
          <p className="text-xs text-ink-muted">
            {(error as any)?.message || "Server bilan bog'lanishda muammo"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              window.location.reload();
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            🔄 Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-32">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          Mening guruhlarim
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          {groups ? `Jami: ${groups.length} ta guruh` : 'Yuklanmoqda...'}
        </p>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Guruh nomi bo'yicha qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
      />

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">
            {search ? 'Natija topilmadi' : "Hali guruhlaringiz yo'q"}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {search
              ? "Qidiruvni o'zgartirib ko'ring"
              : "Administrator sizga guruh biriktirgach ko'rinadi"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                haptic('light');
                navigate(`/teacher/groups/${g.id}`);
              }}
              className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {g.name}
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    👥 {g._count?.members ?? 0} talaba
                    {' · '}
                    📚 {g._count?.assignments ?? 0} material
                  </p>
                  {g.description && (
                    <p className="text-[11px] text-ink-muted mt-1 line-clamp-1">
                      {g.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gold bg-gold/10 px-3 py-2 rounded-xl font-semibold shrink-0">
                  Ochish →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TeacherGroups;