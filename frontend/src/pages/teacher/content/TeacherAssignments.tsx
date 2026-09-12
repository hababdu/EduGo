import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTeacherAssignments,
  useTeacherGroups,
  useCreateTeacherAssignment,
  useDeleteTeacherAssignment,
} from '../../../hooks/useTeacherAssignments';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

/* ============================================================
   TYPES (lokal — constants faylga bog'liq emas)
   ============================================================ */
type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  category: AssignmentCategory;
  groupId: string;
  mediaUrl?: string;
}

interface Group {
  id: string;
  name: string;
}

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
    label: "Qo'shimcha resurs",
    short: "Qo'shimcha",
    badge: 'bg-sky-500/10 text-sky-400',
  },
};

const CONTENT_META: Record<ContentType, { label: string; emoji: string }> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'YouTube Video', emoji: '📹' },
};

/* ============================================================
   FORM STATE
   ============================================================ */
interface FormState {
  title: string;
  description: string;
  contentType: ContentType;
  assignmentCategory: AssignmentCategory;
  selectedGroup: string;
  mediaUrl: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  contentType: 'TEXT',
  assignmentCategory: 'LESSON',
  selectedGroup: '',
  mediaUrl: '',
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherAssignments() {
  const navigate = useNavigate();
  const {
    haptic,
    hapticNotify,
    showConfirm,
    showMainButton,
    hideMainButton,
  } = useTelegram();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssignmentCategory>(
    'ALL'
  );
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: groups, isLoading: groupsLoading } = useTeacherGroups();
  const { data: items, isLoading: itemsLoading } = useTeacherAssignments(
    selectedGroupFilter || undefined
  );

  const createMutation = useCreateTeacherAssignment();
  const deleteMutation = useDeleteTeacherAssignment();

  /* ---------- Helpers ---------- */
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => setForm(EMPTY_FORM);

  /* ---------- Submit ---------- */
  const handleSubmit = useCallback(() => {
    if (!form.title.trim() || !form.selectedGroup) {
      hapticNotify('error');
      toast('error', 'Sarlavha va guruhni tanlang!');
      return;
    }
    if (form.contentType !== 'TEXT' && !form.mediaUrl.trim()) {
      hapticNotify('error');
      toast('error', 'Media URL kiritilishi shart!');
      return;
    }

    createMutation.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.contentType,
        category: form.assignmentCategory,
        mediaUrl: form.mediaUrl.trim() || undefined,
        groupId: form.selectedGroup,
      } as any,
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Material muvaffaqiyatli saqlandi!');
          setShowForm(false);
          resetForm();
        },
        onError: (error: any) => {
          hapticNotify('error');
          toast('error', error?.message || 'Saqlashda xatolik!');
        },
      }
    );
  }, [form, createMutation, hapticNotify]);

  /* ---------- Telegram MainButton ---------- */
  useEffect(() => {
    if (!showForm) {
      hideMainButton();
      return;
    }

    const cleanup = showMainButton(
      createMutation.isPending ? 'Saqlanmoqda...' : 'SAQLASH',
      handleSubmit,
      {
        loading: createMutation.isPending,
        disabled: createMutation.isPending,
      }
    );

    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [
    showForm,
    createMutation.isPending,
    handleSubmit,
    showMainButton,
    hideMainButton,
  ]);

  /* ---------- Filter ---------- */
  const filteredItems = useMemo<Assignment[]>(() => {
    if (!items || !Array.isArray(items)) return [];
    const q = search.trim().toLowerCase();

    return (items as Assignment[]).filter((item) => {
      if (!item) return false;
      const matchesSearch =
        !q ||
        (item.title?.toLowerCase() || '').includes(q) ||
        (item.description?.toLowerCase() || '').includes(q);
      const matchesCategory =
        filterCategory === 'ALL' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, filterCategory]);

  /* ---------- Delete ---------- */
  const handleDelete = async (item: Assignment) => {
    haptic('medium');

    const confirmed = await showConfirm(
      `"${item.title}" ni o'chirmoqchimisiz?`
    );
    if (!confirmed) return;

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Material o'chirildi");
      },
      onError: (error: any) => {
        hapticNotify('error');
        toast('error', error?.message || "O'chirishda xatolik!");
      },
    });
  };

  /* ---------- Derived flags ---------- */
  const hasNoItems = !itemsLoading && (!items || items.length === 0);
  const hasNoResults =
    !itemsLoading && !hasNoItems && filteredItems.length === 0;

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-32">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-4 bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <span className="px-2.5 py-1 rounded-lg bg-gold/10 text-gold text-[10px] font-semibold uppercase tracking-wider">
            O'qituvchi Paneli
          </span>
          <h1 className="font-display text-xl sm:text-2xl text-ink mt-2">
            Dars Materiallari
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Guruhlaringiz uchun darslar, uy vazifalari va resurslar
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-gold/10"
        >
          {showForm ? '✕ Yopish' : '+ Yangi material'}
        </button>
      </div>

      {/* ============ FORMA ============ */}
      {showForm && (
        <div className="bg-surface/40 p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-display text-base text-ink">Yangi material</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setShowForm(false);
                resetForm();
              }}
              className="text-xs text-ink-muted hover:text-ink px-3 py-2 rounded-xl bg-white/5"
            >
              Bekor qilish
            </button>
          </div>

          <Field label="Material toifasi">
            <select
              value={form.assignmentCategory}
              onChange={(e) =>
                update('assignmentCategory', e.target.value as AssignmentCategory)
              }
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
            >
              <option value="LESSON">📖 Dars mavzusi</option>
              <option value="HOMEWORK">📝 Uy vazifasi</option>
              <option value="RESOURCE">📎 Qo'shimcha resurs</option>
            </select>
          </Field>

          <Field label="Kontent formati">
            <select
              value={form.contentType}
              onChange={(e) => update('contentType', e.target.value as ContentType)}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
            >
              <option value="TEXT">📄 Matn</option>
              <option value="IMAGE">🖼️ Rasm</option>
              <option value="PDF">📑 PDF fayl</option>
              <option value="VIDEO">📹 YouTube Video</option>
            </select>
          </Field>

          <Field label="Qaysi guruhga *">
            <select
              value={form.selectedGroup}
              onChange={(e) => update('selectedGroup', e.target.value)}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
            >
              <option value="">Guruhni tanlang...</option>
              {(groups as Group[] | undefined)?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sarlavha *">
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Masalan: 3-mavzu uyga vazifa"
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
            />
          </Field>

          {form.contentType !== 'TEXT' && (
            <Field
              label={
                form.contentType === 'VIDEO'
                  ? 'YouTube Video URL'
                  : form.contentType === 'IMAGE'
                  ? 'Rasm URL'
                  : 'PDF Fayl URL'
              }
            >
              <input
                value={form.mediaUrl}
                onChange={(e) => update('mediaUrl', e.target.value)}
                placeholder="https://..."
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>
          )}

          <Field label="Tafsilotlar / Ko'rsatmalar">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="O'quvchilar bajarishi kerak bo'lgan shartlar..."
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
            />
          </Field>

          <p className="text-[10px] text-ink-muted text-center">
            Pastdagi Telegram tugmasi orqali saqlashingiz mumkin
          </p>
        </div>
      )}

      {/* ============ FILTER + SEARCH ============ */}
      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Qidirish..."
          className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['ALL', 'LESSON', 'HOMEWORK', 'RESOURCE'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                haptic('light');
                setFilterCategory(c);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                filterCategory === c
                  ? 'bg-gold text-base'
                  : 'bg-white/5 text-ink-muted hover:bg-white/10'
              }`}
            >
              {c === 'ALL' ? 'Barchasi' : CATEGORY_META[c].short}
            </button>
          ))}
        </div>

        <select
          value={selectedGroupFilter}
          onChange={(e) => setSelectedGroupFilter(e.target.value)}
          className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-xs outline-none border border-white/5 text-ink min-h-[44px]"
        >
          <option value="">Barcha guruhlarim</option>
          {(groups as Group[] | undefined)?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* ============ LIST ============ */}
      {itemsLoading || groupsLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : hasNoItems ? (
        <EmptyState
          title="Hali material qo'shmagansiz"
          subtitle="Birinchi darsingizni yoki uy vazifangizni qo'shing"
          ctaLabel="+ Birinchi materialni qo'shish"
          onCta={() => {
            haptic('light');
            setShowForm(true);
          }}
        />
      ) : hasNoResults ? (
        <EmptyState
          title="Natija topilmadi"
          subtitle="Filtr yoki qidiruvni o'zgartirib ko'ring"
          ctaLabel="Filtrlarni tozalash"
          onCta={() => {
            haptic('light');
            setSearch('');
            setFilterCategory('ALL');
            setSelectedGroupFilter('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const cat = CATEGORY_META[item.category] ?? CATEGORY_META.LESSON;
            const content = CONTENT_META[item.type] ?? CONTENT_META.TEXT;

            return (
              <div
                key={item.id}
                className="group bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 transition-all"
              >
                <div
                  onClick={() => {
                    haptic('light');
                    navigate(`/teacher/assignments/${item.id}`);
                  }}
                  className="space-y-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${cat.badge}`}
                    >
                      {cat.label}
                    </span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                      {content.emoji} {content.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-gold transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-muted line-clamp-2">
                    {item.description || 'Tavsif yoʻq'}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light');
                      navigate(`/teacher/assignments/${item.id}`);
                    }}
                    className="flex-1 text-xs font-semibold text-gold bg-gold/10 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-transform min-h-[40px]"
                  >
                    Ochish →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deleteMutation.isPending}
                    className="text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[40px]"
                  >
                    🗑
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

/* ============================================================
   YORDAMCHI KOMPONENTLAR
   ============================================================ */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-ink-muted font-medium">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-muted">{subtitle}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export default TeacherAssignments;