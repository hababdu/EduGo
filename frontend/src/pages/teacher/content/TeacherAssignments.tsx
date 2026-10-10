// src/pages/teacher/TeacherAssignments.tsx
import { formatDue } from '../../../lib/due';
import { StaffHero } from '../../../components/staff';
import { IMAGES } from '../../../design/images';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTeacherAssignments,
  useTeacherGroups,
  useDeleteTeacherAssignment,
} from '../../../hooks/useTeacherAssignments';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { MaterialComposer } from '../../../components/materials/MaterialComposer';
import {
  Section,
  CardList,
  EmptyState,
  FilterBar,
  Skeleton,
} from '../../../components/ui';
import {
  Plus,
  X,
  Sparkles,
  Trash2,
  FileText,
  BookOpen,
  ClipboardList,
  FolderOpen,
  Video,
  Image as ImageIcon,
  FileType,
  ChevronRight,
} from '../../../design/icons';
import { TEXT, CONTROL, PAGE } from '../../../design/tokens';

type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO' | 'FILE';
type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  category: AssignmentCategory;
  groupId: string;
  mediaUrl?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  dueAt?: string | null;
  files?: { id: string }[];
  group?: { id: string; name: string } | null;
  stats?: { viewed: number; total: number };
}

interface Group {
  id: string;
  name: string;
}

const CATEGORY_META: Record<AssignmentCategory, { label: string; cls: string; Icon: any }> = {
  LESSON: { label: 'Dars', cls: 'bg-gold/10 text-gold', Icon: BookOpen },
  HOMEWORK: { label: 'Uy vazifasi', cls: 'bg-coral/10 text-coral', Icon: ClipboardList },
  RESOURCE: { label: "Qo'shimcha", cls: 'bg-sky-500/10 text-sky-400', Icon: FolderOpen },
};

const CONTENT_META: Record<ContentType, { label: string; Icon: any }> = {
  TEXT: { label: 'Matn', Icon: FileText },
  IMAGE: { label: 'Rasm', Icon: ImageIcon },
  PDF: { label: 'PDF', Icon: FileType },
  VIDEO: { label: 'Video', Icon: Video },
  FILE: { label: 'Hujjat', Icon: FileText },
};

export function TeacherAssignments() {
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm } = useTelegram();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssignmentCategory>('ALL');
  const [groupFilter, setGroupFilter] = useState('');

  const { data: groups, isLoading: groupsLoading } = useTeacherGroups();
  const { data: items, isLoading: itemsLoading } = useTeacherAssignments(
    groupFilter || undefined,
  );
  const deleteMutation = useDeleteTeacherAssignment();

  const filteredItems = useMemo<Assignment[]>(() => {
    if (!items || !Array.isArray(items)) return [];
    const q = search.trim().toLowerCase();
    return (items as Assignment[]).filter((item) => {
      if (!item) return false;
      const ms =
        !q ||
        (item.title?.toLowerCase() || '').includes(q) ||
        (item.description?.toLowerCase() || '').includes(q);
      const mc = filterCategory === 'ALL' || item.category === filterCategory;
      return ms && mc;
    });
  }, [items, search, filterCategory]);

  const handleDelete = async (item: Assignment) => {
    haptic('medium');
    const ok = await showConfirm(`"${item.title}" ni o'chirishni tasdiqlaysizmi?`);
    if (!ok) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "O'chirildi");
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik');
      },
    });
  };

  const hasNoItems = !itemsLoading && (!items || items.length === 0);
  const hasNoResults = !itemsLoading && !hasNoItems && filteredItems.length === 0;

  return (
    <div className={PAGE}>
      <StaffHero
        eyebrow="MATERIALLAR"
        title="Materiallar"
        subtitle="Darslar, uy vazifalari, resurslar"
        image={IMAGES.ieltsLanguage}
        accent="teal"
        actions={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setShowForm((v) => !v);
            }}
            className={CONTROL.buttonPrimary}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Yopish' : 'Yangi'}
          </button>
        }
      />

      {showForm && (
        <MaterialComposer
          groups={(groups as Group[] | undefined) ?? []}
          defaultGroupId={groupFilter || undefined}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Material qidirish..."
        chips={[
          { key: 'ALL', label: 'Barchasi' },
          { key: 'LESSON', label: 'Dars' },
          { key: 'HOMEWORK', label: 'Uy vazifasi' },
          { key: 'RESOURCE', label: "Qo'shimcha" },
        ]}
        activeChip={filterCategory}
        onChipChange={(k) => setFilterCategory(k as any)}
        extra={
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className={CONTROL.select + ' text-xs'}
          >
            <option value="">Barcha guruhlar</option>
            {(groups as Group[] | undefined)?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        }
      />

      {/* List */}
      {itemsLoading || groupsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : hasNoItems ? (
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={FileText}
            title="Materiallar yo'q"
            subtitle="Birinchi darsingizni qo'shing"
            action={{
              label: "Material qo'shish",
              icon: Plus,
              onClick: () => {
                haptic('light');
                setShowForm(true);
              },
            }}
          />
        </div>
      ) : hasNoResults ? (
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={FileText}
            title="Natija topilmadi"
            action={{
              label: 'Tozalash',
              icon: X,
              onClick: () => {
                haptic('light');
                setSearch('');
                setFilterCategory('ALL');
                setGroupFilter('');
              },
            }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const cat = CATEGORY_META[item.category] ?? CATEGORY_META.LESSON;
            const content = CONTENT_META[item.type] ?? CONTENT_META.TEXT;
            return (
              <div
                key={item.id}
                className="bg-surface/20 border border-white/5 rounded-2xl p-3.5 hover:bg-surface/30 transition"
              >
                <button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    navigate(`/teacher/assignments/${item.id}`);
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold ${cat.cls}`}
                    >
                      <cat.Icon className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-white/5 text-ink-muted">
                      <content.Icon className="w-3 h-3" />
                      {content.label}
                    </span>
                    {item.status === 'DRAFT' && (
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md font-bold bg-coral/15 text-coral">
                        QORALAMA
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-muted">
                    {item.group && <span>{item.group.name}</span>}
                    {!!item.files?.length && <span>{item.files.length} ta fayl</span>}
                    {item.dueAt && <span>Muddat: {formatDue(item.dueAt)}</span>}
                    {item.status !== 'DRAFT' && item.stats && item.stats.total > 0 && (
                      <span className={item.stats.viewed === item.stats.total ? 'text-teal' : ''}>
                        Ko'rgan: {item.stats.viewed}/{item.stats.total}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light');
                      navigate(`/teacher/assignments/${item.id}`);
                    }}
                    className="flex-1 text-xs font-semibold text-gold bg-gold/10 px-3 py-2 rounded-lg active:scale-[0.98] transition inline-flex items-center justify-center gap-1"
                  >
                    Ochish
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 bg-red-500/10 px-3 py-2 rounded-lg active:scale-[0.98] transition disabled:opacity-50"
                    aria-label="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default TeacherAssignments;