// src/pages/teacher/TeacherAssignments.tsx
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
import type { GeneratedMaterial } from '../../../lib/ai-service';
import { AIMaterialGenerator } from '../../../components/ai/AIMaterialGenerator';
import {
  PageHeader,
  Section,
  CardList,
  EmptyState,
  FilterBar,
  Field,
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
};

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

export function TeacherAssignments() {
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm, showMainButton, hideMainButton } = useTelegram();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssignmentCategory>('ALL');
  const [groupFilter, setGroupFilter] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showAIModal, setShowAIModal] = useState(false);

  const { data: groups, isLoading: groupsLoading } = useTeacherGroups();
  const { data: items, isLoading: itemsLoading } = useTeacherAssignments(
    groupFilter || undefined,
  );
  const createMutation = useCreateTeacherAssignment();
  const deleteMutation = useDeleteTeacherAssignment();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => setForm(EMPTY_FORM);

  const handleAIAccept = (result: GeneratedMaterial) => {
    setForm((prev) => ({
      ...prev,
      title: result.title,
      description: result.description,
      contentType: 'VIDEO',
      mediaUrl: result.youtubeSearchUrl,
    }));
    hapticNotify('success');
    toast('success', 'AI material tanlandi');
  };

  const handleSubmit = useCallback(() => {
    if (!form.title.trim() || !form.selectedGroup) {
      hapticNotify('error');
      toast('error', 'Sarlavha va guruhni tanlang');
      return;
    }
    if (form.contentType !== 'TEXT' && !form.mediaUrl.trim()) {
      hapticNotify('error');
      toast('error', 'Media URL kerak');
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
          toast('success', 'Material saqlandi');
          setShowForm(false);
          resetForm();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || 'Xatolik');
        },
      },
    );
  }, [form, createMutation, hapticNotify]);

  useEffect(() => {
    if (!showForm) {
      hideMainButton();
      return;
    }
    const cleanup = showMainButton(
      createMutation.isPending ? 'Saqlanmoqda...' : 'SAQLASH',
      handleSubmit,
      { loading: createMutation.isPending, disabled: createMutation.isPending },
    );
    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [showForm, createMutation.isPending, handleSubmit, showMainButton, hideMainButton]);

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
      <PageHeader
        title="Materiallar"
        subtitle="Darslar, uy vazifalari, resurslar"
        actions={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setShowForm((v) => !v);
              if (!showForm) resetForm();
            }}
            className={CONTROL.buttonPrimary}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Yopish' : 'Yangi'}
          </button>
        }
      />

      {showForm && (
        <div className="bg-surface/30 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h2 className={TEXT.h2}>Yangi material</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setShowForm(false);
                resetForm();
              }}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Bekor qilish
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic('light');
              setShowAIModal(true);
            }}
            className={CONTROL.buttonSubtle + ' w-full'}
          >
            <Sparkles className="w-4 h-4" />
            AI bilan material yaratish
          </button>

          <Field label="Toifa">
            <select
              value={form.assignmentCategory}
              onChange={(e) =>
                update('assignmentCategory', e.target.value as AssignmentCategory)
              }
              className={CONTROL.select}
            >
              <option value="LESSON">Dars mavzusi</option>
              <option value="HOMEWORK">Uy vazifasi</option>
              <option value="RESOURCE">Qo'shimcha resurs</option>
            </select>
          </Field>

          <Field label="Format">
            <select
              value={form.contentType}
              onChange={(e) => update('contentType', e.target.value as ContentType)}
              className={CONTROL.select}
            >
              <option value="TEXT">Matn</option>
              <option value="IMAGE">Rasm</option>
              <option value="PDF">PDF fayl</option>
              <option value="VIDEO">YouTube video</option>
            </select>
          </Field>

          <Field label="Guruh" required>
            <select
              value={form.selectedGroup}
              onChange={(e) => update('selectedGroup', e.target.value)}
              className={CONTROL.select}
            >
              <option value="">Guruhni tanlang...</option>
              {(groups as Group[] | undefined)?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sarlavha" required>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Masalan: 3-mavzu uyga vazifa"
              className={CONTROL.input}
            />
          </Field>

          {form.contentType !== 'TEXT' && (
            <Field
              label={
                form.contentType === 'VIDEO'
                  ? 'YouTube URL'
                  : form.contentType === 'IMAGE'
                  ? 'Rasm URL'
                  : 'PDF URL'
              }
            >
              <input
                value={form.mediaUrl}
                onChange={(e) => update('mediaUrl', e.target.value)}
                placeholder="https://..."
                className={CONTROL.input}
              />
            </Field>
          )}

          <Field label="Tavsif">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              placeholder="O'quvchilar uchun ko'rsatmalar..."
              className={CONTROL.textarea}
            />
          </Field>
        </div>
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
                  </div>
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
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

      <AIMaterialGenerator
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        initialCategory={form.assignmentCategory}
        onAccept={handleAIAccept}
      />
    </div>
  );
}

export default TeacherAssignments;