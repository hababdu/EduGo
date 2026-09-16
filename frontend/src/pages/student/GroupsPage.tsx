// src/pages/student/GroupsPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

/* ============================================================
   TYPES
   ============================================================ */
interface Teacher {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

interface StudentGroup {
  id: string;
  name: string;
  description?: string | null;
  teacher?: Teacher | null;
  _count?: {
    members?: number;
    assignments?: number;
  };
}

/* ============================================================
   HOOK
   ============================================================ */
function useMyGroups() {
  return useQuery({
    queryKey: ['student', 'groups'],
    queryFn: () => apiFetch<StudentGroup[]>('/api/v1/groups'),
    staleTime: 60_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function GroupsPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: groups, isLoading, error } = useMyGroups();
  const [search, setSearch] = useState('');

  /* ---------- Filter ---------- */
  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = search.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [groups, search]);

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
        {/* Header skeleton */}
        <div className="h-20 bg-surface/30 rounded-3xl animate-pulse" />
        {/* List skeleton */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
          />
        ))}
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Guruhlarni yuklashda xatolik
          </p>
          <p className="text-xs text-ink-muted">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Server bilan bog'lanishda muammo"}
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

  /* ---------- Empty ---------- */
  const hasNoGroups = !groups || groups.length === 0;

  /* ---------- Render ---------- */
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* ============ HEADER ============ */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          Mening guruhlarim
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          {groups ? `Jami: ${groups.length} ta guruh` : 'Yuklanmoqda...'}
        </p>
      </div>

      {/* ============ SEARCH ============ */}
      {groups && groups.length > 3 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Guruh nomi bo'yicha qidirish..."
          className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px] focus:border-gold/50"
        />
      )}

      {/* ============ EMPTY STATE ============ */}
      {hasNoGroups ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <div className="text-4xl">👥</div>
          <p className="text-sm font-semibold text-ink">
            Hali guruhlaringiz yo'q
          </p>
          <p className="text-xs text-ink-muted">
            O'qituvchi sizni guruhga qo'shgach, bu yerda ko'rinadi
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">Natija topilmadi</p>
          <p className="text-xs text-ink-muted">
            Qidiruvni o'zgartirib ko'ring
          </p>
        </div>
      ) : (
        /* ============ LIST ============ */
        <div className="space-y-3">
          {filtered.map((g) => {
            const teacher = g.teacher;
            const teacherName = teacher
              ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() ||
                teacher.username ||
                "O'qituvchi"
              : null;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  navigate(`/groups/${g.id}`);
                }}
                className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center text-xl shrink-0">
                    👥
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink truncate">
                      {g.name}
                    </h3>

                    {g.description && (
                      <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                        {g.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-ink-muted mt-2 flex-wrap">
                      {teacherName && (
                        <span className="flex items-center gap-1">
                          👤 {teacherName}
                        </span>
                      )}
                      {g._count?.members !== undefined && (
                        <span className="flex items-center gap-1">
                          👥 {g._count.members} a'zo
                        </span>
                      )}
                      {g._count?.assignments !== undefined && (
                        <span className="flex items-center gap-1">
                          📚 {g._count.assignments} material
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <span className="text-ink-muted text-xs shrink-0 mt-1">
                    ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GroupsPage;