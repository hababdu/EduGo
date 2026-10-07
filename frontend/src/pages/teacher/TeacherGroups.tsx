// src/pages/teacher/TeacherGroups.tsx
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';
<<<<<<< HEAD
=======
import {
  FilterBar,
  EmptyState,
  Skeleton,
} from '../../components/ui';
import { StaffHero, KpiCard, ProgressBar } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { Users, FolderOpen, FileText, RotateCw } from '../../design/icons';
import { PAGE_WIDE } from '../../design/tokens';
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c

interface TeacherGroup {
  id: string;
  name: string;
  description?: string | null;
  posterUrl?: string | null;
<<<<<<< HEAD
  _count?: {
    members?: number;
    assignments?: number;
  };
=======
  maxCapacity?: number | null;
  lessonDays?: number[] | null;
  lessonStartTime?: string | null;
  lessonEndTime?: string | null;
  room?: string | null;
  _count?: { members?: number; assignments?: number };
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c
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

<<<<<<< HEAD
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
=======
  const totalMembers = (groups ?? []).reduce((n, g) => n + (g._count?.members ?? 0), 0);
  const totalMaterials = (groups ?? []).reduce((n, g) => n + (g._count?.assignments ?? 0), 0);

  if (isLoading) {
    return (
      <div className={PAGE_WIDE}>
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
<<<<<<< HEAD
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
=======
      <div className={PAGE_WIDE}>
        <StaffHero accent="gold" image={IMAGES.hero} eyebrow="O'qituvchi" title="Guruhlar" />
        <div className="bg-surface/40 border border-white/10 rounded-3xl">
          <EmptyState
            icon={RotateCw}
            title="Yuklashda xatolik"
            subtitle={(error as any)?.message}
            action={{ label: 'Qayta yuklash', onClick: () => window.location.reload() }}
          />
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
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
=======
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={IMAGES.mathCoding}
        eyebrow="O'qituvchi"
        title="Guruhlar"
        subtitle={`${groups?.length ?? 0} ta guruh sizga biriktirilgan`}
        footer={
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <KpiCard label="Guruhlar" value={groups?.length ?? 0} icon={FolderOpen} accent="gold" />
            <KpiCard label="Talabalar" value={totalMembers} icon={Users} accent="teal" />
            <KpiCard label="Materiallar" value={totalMaterials} icon={FileText} accent="sky" />
          </div>
        }
      />
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c

      {/* ============ SEARCH ============ */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Guruh nomi bo'yicha qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px] focus:border-gold/50"
      />

      {/* ============ EMPTY ============ */}
      {filtered.length === 0 ? (
<<<<<<< HEAD
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
=======
        <div className="bg-surface/40 border border-white/10 rounded-3xl">
          <EmptyState
            icon={search ? FolderOpen : Users}
            title={search ? 'Natija topilmadi' : "Guruhlaringiz yo'q"}
            subtitle={
              search
                ? "Boshqa so'z bilan urinib ko'ring"
                : "Administrator guruh biriktirgach ko'rinadi"
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onClick={() => {
                haptic('light');
                navigate(`/teacher/groups/${g.id}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c

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

<<<<<<< HEAD
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
=======
  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-surface/50 border border-white/10 hover:border-gold/30 rounded-2xl overflow-hidden active:scale-[0.98] transition text-left flex flex-col"
    >
      {/* Poster */}
      <div className="relative w-full h-32 bg-surface/50 overflow-hidden shrink-0">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold/15 to-teal/10 flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-gold/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base/70 to-transparent" aria-hidden="true" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-ink truncate">{group.name}</h3>
        <ScheduleBadge schedule={group} />
        <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-auto">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {members}{group.maxCapacity ? ` / ${group.maxCapacity}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {materials}
          </span>
        </div>
        {group.maxCapacity ? (
          <ProgressBar value={(members / group.maxCapacity) * 100} tone="auto" />
        ) : null}
      </div>
    </button>
>>>>>>> 62ed532fc7c34c590e9fc4359c1c2a48d1bf771c
  );
}

export default TeacherGroups;