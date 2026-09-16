// src/pages/student/LessonsPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

/* ============================================================
   TYPES
   ============================================================ */
type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

interface AssignmentTest {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  order: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  description?: string | null;
  type: ContentType;
  category: AssignmentCategory;
  mediaUrl?: string | null;
  groupId: string;
  createdAt: string;
  group?: { id: string; name: string } | null;
  teacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  } | null;
  tests?: AssignmentTest[];
}

/* ============================================================
   META
   ============================================================ */
const CATEGORY_META: Record<
  AssignmentCategory,
  { label: string; short: string; badge: string }
> = {
  LESSON: {
    label: 'Dars mavzusi',
    short: 'Dars',
    badge: 'bg-gold/10 text-gold',
  },
  HOMEWORK: {
    label: 'Uy vazifasi',
    short: 'Uy vazifasi',
    badge: 'bg-coral/10 text-coral',
  },
  RESOURCE: {
    label: "Qo'shimcha",
    short: "Qo'shimcha",
    badge: 'bg-sky-500/10 text-sky-400',
  },
};

const CONTENT_META: Record<ContentType, { label: string; emoji: string }> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'Video', emoji: '📹' },
};

/* ============================================================
   HOOK — TO'G'RI URL
   ============================================================ */
function useMyAssignments() {
  return useQuery({
    queryKey: ['student', 'assignments'],
    queryFn: () =>
      apiFetch<AssignmentItem[]>('/api/v1/dashboard/assignments'),  // ✅ TO'G'RI
    staleTime: 30_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function LessonsPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: items, isLoading, error } = useMyAssignments();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssignmentCategory>(
    'ALL',
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  /* ---------- Guruhlarni ajratib olish ---------- */
  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of items) {
      if (!item.group) continue;
      const existing = map.get(item.group.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.group.id, {
          id: item.group.id,
          name: item.group.name,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [items]);

  /* ---------- Filter ---------- */
  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description?.toLowerCase() || '').includes(q);
      const matchesCategory =
        filterCategory === 'ALL' || item.category === filterCategory;
      const matchesGroup =
        !selectedGroupId || item.groupId === selectedGroupId;
      return matchesSearch && matchesCategory && matchesGroup;
    });
  }, [items, search, filterCategory, selectedGroupId]);

  /* ---------- Guruh bo'yicha guruhlash ---------- */
  const groupedByGroup = useMemo(() => {
    const map = new Map<
      string,
      { group: { id: string; name: string }; items: AssignmentItem[] }
    >();

    for (const item of filtered) {
      const groupId = item.group?.id ?? 'unknown';
      const groupName = item.group?.name ?? "Noma'lum guruh";

      if (!map.has(groupId)) {
        map.set(groupId, {
          group: { id: groupId, name: groupName },
          items: [],
        });
      }
      map.get(groupId)!.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.group.name.localeCompare(b.group.name),
    );
  }, [filtered]);

  const hasActiveFilters =
    search.trim() !== '' ||
    filterCategory !== 'ALL' ||
    selectedGroupId !== null;

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
        <div className="h-20 bg-surface/30 rounded-3xl animate-pulse" />
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
            Materiallarni yuklashda xatolik
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
  const hasNoItems = !items || items.length === 0;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* ============ HEADER ============ */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="font-display text-xl sm:text-2xl text-ink">Darslar</h1>
        <p className="text-xs text-ink-muted mt-1">
          {items
            ? `${items.length} ta material · ${groups.length} ta guruh`
            : 'Yuklanmoqda...'}
        </p>
      </div>

      {/* ============ EMPTY ============ */}
      {hasNoItems ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <div className="text-4xl">📚</div>
          <p className="text-sm font-semibold text-ink">
            Hali materiallaringiz yo'q
          </p>
          <p className="text-xs text-ink-muted">
            O'qituvchingiz material biriktirgach, bu yerda ko'rinadi
          </p>
        </div>
      ) : (
        <>
          {/* ============ SEARCH ============ */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Material nomi bo'yicha qidirish..."
            className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px] focus:border-gold/50"
          />

          {/* ============ GROUP FILTER ============ */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-ink-muted font-medium block">
                Guruh bo'yicha
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    setSelectedGroupId(null);
                  }}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                    selectedGroupId === null
                      ? 'bg-gold text-base'
                      : 'bg-white/5 text-ink-muted hover:bg-white/10'
                  }`}
                >
                  Barchasi ({items?.length ?? 0})
                </button>

                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      haptic('light');
                      setSelectedGroupId(g.id);
                    }}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      selectedGroupId === g.id
                        ? 'bg-gold text-base'
                        : 'bg-white/5 text-ink-muted hover:bg-white/10'
                    }`}
                  >
                    <span>👥</span>
                    <span>{g.name}</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
                      {g.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============ CATEGORY FILTER ============ */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { key: 'ALL', label: 'Barchasi' },
              { key: 'LESSON', label: '📖 Darslar' },
              { key: 'HOMEWORK', label: '📝 Uy vazifalari' },
              { key: 'RESOURCE', label: "📎 Qo'shimcha" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  haptic('light');
                  setFilterCategory(key as any);
                }}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                  filterCategory === key
                    ? 'bg-gold text-base'
                    : 'bg-white/5 text-ink-muted hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ============ ACTIVE FILTERS ============ */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between bg-surface/20 px-4 py-3 rounded-2xl border border-white/5">
              <span className="text-xs text-ink-muted">
                Topildi: <strong className="text-ink">{filtered.length}</strong> ta
              </span>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  setSearch('');
                  setFilterCategory('ALL');
                  setSelectedGroupId(null);
                }}
                className="text-xs text-gold font-semibold"
              >
                Tozalash
              </button>
            </div>
          )}

          {/* ============ LIST ============ */}
          {groupedByGroup.length === 0 ? (
            <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
              <p className="text-sm font-semibold text-ink">Natija topilmadi</p>
              <p className="text-xs text-ink-muted">
                Filtr yoki qidiruvni o'zgartirib ko'ring
              </p>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  setSearch('');
                  setFilterCategory('ALL');
                  setSelectedGroupId(null);
                }}
                className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                Filtrlarni tozalash
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedByGroup.map(({ group, items: groupItems }) => (
                <section key={group.id} className="space-y-3">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-sm font-semibold text-ink truncate">
                      👥 {group.name}
                    </span>
                    <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-semibold shrink-0">
                      {groupItems.length} ta
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    {groupItems.map((item) => {
                      const cat = CATEGORY_META[item.category] ?? CATEGORY_META.LESSON;
                      const content = CONTENT_META[item.type] ?? CONTENT_META.TEXT;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            haptic('light');
                            navigate(`/lessons/${item.id}`);
                          }}
                          className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
                        >
                          <div className="space-y-2">
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${cat.badge}`}
                              >
                                {cat.label}
                              </span>
                              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                                {content.emoji} {content.label}
                              </span>
                              {item.tests && item.tests.length > 0 && (
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-gold/10 text-gold">
                                  🧠 {item.tests.length} ta test
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="text-sm font-semibold text-ink truncate">
                              {item.title}
                            </h3>

                            {/* Description */}
                            {item.description && (
                              <p className="text-xs text-ink-muted line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LessonsPage;