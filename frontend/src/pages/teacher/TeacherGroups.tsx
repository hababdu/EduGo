// src/pages/teacher/TeacherGroups.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';
import {
  PageHeader,
  FilterBar,
  EmptyState,
  Skeleton,
} from '../../components/ui';
import { Users, FolderOpen, FileText, RotateCw } from '../../design/icons';
import { TEXT, PAGE } from '../../design/tokens';

interface TeacherGroup {
  id: string;
  name: string;
  description?: string | null;
  posterUrl?: string | null;
  _count?: { members?: number; assignments?: number };
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
        (g.description?.toLowerCase() || '').includes(q),
    );
  }, [groups, search]);

  if (isLoading) {
    return (
      <div className={PAGE}>
        <div className="h-10 w-40 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={PAGE}>
        <PageHeader title="Guruhlar" />
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={RotateCw}
            title="Yuklashda xatolik"
            subtitle={(error as any)?.message}
            action={{ label: 'Qayta yuklash', onClick: () => window.location.reload() }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <PageHeader title="Guruhlar" subtitle={`${groups?.length ?? 0} ta guruh`} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Guruh qidirish..."
      />

      {filtered.length === 0 ? (
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
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
        <div className="grid grid-cols-2 gap-3">
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

function GroupCard({ group, onClick }: { group: TeacherGroup; onClick: () => void }) {
  const poster = group.posterUrl ? getFullUrl(group.posterUrl) : null;
  const members = group._count?.members ?? 0;
  const materials = group._count?.assignments ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-surface/20 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition text-left flex flex-col"
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
      </div>

      {/* Info */}
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-ink truncate">{group.name}</h3>
        <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-auto">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {members}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {materials}
          </span>
        </div>
      </div>
    </button>
  );
}

export default TeacherGroups;