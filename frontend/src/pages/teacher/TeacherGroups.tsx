// src/pages/teacher/TeacherGroups.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';

interface TeacherGroup {
  id: string;
  name: string;
  description?: string | null;
  posterUrl?: string | null;
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
    return groups.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)),
    );
  }, [groups, search]);

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-5 pb-32">
        <div className="h-24 bg-surface/30 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
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
      {/* ============ HEADER ============ */}
      <div className="bg-gradient-to-br from-gold/10 via-surface/20 to-teal/5 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold flex items-center justify-center text-2xl shrink-0">
            👥
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl text-ink truncate">
              Mening guruhlarim
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {groups ? `${groups.length} ta guruh` : 'Yuklanmoqda...'}
            </p>
          </div>
        </div>
      </div>

      {/* ============ SEARCH ============ */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Guruh nomi bo'yicha qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px] focus:border-gold/50"
      />

      {/* ============ EMPTY ============ */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <div className="text-5xl">{search ? '🔍' : '👥'}</div>
          <p className="text-sm font-semibold text-ink">
            {search ? 'Natija topilmadi' : "Hali guruhlaringiz yo'q"}
          </p>
          <p className="text-xs text-ink-muted max-w-xs mx-auto">
            {search
              ? "Qidiruvni o'zgartirib ko'ring"
              : "Administrator sizga guruh biriktirgach ko'rinadi"}
          </p>
        </div>
      ) : (
        /* ============ GRID — 2 USTUN ============ */
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((g) => {
            const posterFullUrl = g.posterUrl
              ? getFullUrl(g.posterUrl)
              : null;
            const membersCount = g._count?.members ?? 0;
            const assignmentsCount = g._count?.assignments ?? 0;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/groups/${g.id}`);
                }}
                className="group bg-surface/20 hover:bg-surface/40 rounded-3xl border border-white/5 active:scale-[0.98] transition-all cursor-pointer overflow-hidden flex flex-col text-left"
              >
                {/* ===== POSTER ===== */}
                <div className="relative w-full h-40 bg-surface/50 overflow-hidden">
                  {posterFullUrl ? (
                    <img
                      src={posterFullUrl}
                      alt={g.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-gold/20 via-gold/5 to-teal/10 flex items-center justify-center text-5xl">
                      📁
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Members badge */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                    <span>👥</span>
                    <span>{membersCount}</span>
                  </div>

                  {/* Materials badge */}
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                    <span>📚</span>
                    <span>{assignmentsCount}</span>
                  </div>
                </div>

                {/* ===== INFO ===== */}
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">
                    {g.name}
                  </h3>
                  {g.description && (
                    <p className="text-[11px] text-ink-muted line-clamp-2 leading-snug">
                      {g.description}
                    </p>
                  )}
                  <div className="mt-auto pt-1 flex items-center justify-end">
                    <span className="text-[10px] text-gold font-semibold">
                      Ochish →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TeacherGroups;