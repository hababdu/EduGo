// src/pages/teacher/TeacherAssignmentDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTeacherAssignment,
  useUpdateTeacherAssignment,
  useDeleteTeacherAssignment,
  useTeacherGroups,
} from '../../../hooks/useTeacherAssignments';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import {
  AssignmentCategory,
  CATEGORY_META,
  CONTENT_META,
  ContentType,
} from '../../../constants/assignment';
import {
  PageHeader,
  Section,
  Field,
  Skeleton,
} from '../../../components/ui';
import { Edit3, Trash2, ExternalLink, X } from '../../../design/icons';
import { TEXT, CONTROL, PAGE } from '../../../design/tokens';

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

export function TeacherAssignmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    haptic, hapticNotify, showConfirm,
    showMainButton, hideMainButton,
    showBackButton, hideBackButton,
  } = useTelegram();

  const { data: assignment, isLoading } = useTeacherAssignment(id);
  const { data: groups } = useTeacherGroups();
  const updateMutation = useUpdateTeacherAssignment(id);
  const deleteMutation = useDeleteTeacherAssignment();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!assignment) return;
    const item = assignment as any;
    setForm({
      title: item.title || '',
      description: item.description || '',
      contentType: (item.type as ContentType) || 'TEXT',
      assignmentCategory: (item.category as AssignmentCategory) || 'LESSON',
      selectedGroup: item.groupId || item.group || '',
      mediaUrl: item.mediaUrl || '',
    });
  }, [assignment]);

  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate('/teacher/assignments');
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  const handleUpdate = useCallback(() => {
    if (!form.title.trim() || !form.selectedGroup) {
      hapticNotify('error');
      toast('error', 'Sarlavha va guruh kerak');
      return;
    }
    if (form.contentType !== 'TEXT' && !form.mediaUrl.trim()) {
      hapticNotify('error');
      toast('error', 'Media URL kerak');
      return;
    }

    updateMutation.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.contentType,
        category: form.assignmentCategory,
        groupId: form.selectedGroup,
        mediaUrl: form.mediaUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Saqlandi');
          setIsEditing(false);
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || 'Xatolik');
        },
      },
    );
  }, [form, updateMutation, hapticNotify]);

  useEffect(() => {
    if (!isEditing) {
      hideMainButton();
      return;
    }
    const cleanup = showMainButton(
      updateMutation.isPending ? 'Saqlanmoqda...' : 'SAQLASH',
      handleUpdate,
      { loading: updateMutation.isPending, disabled: updateMutation.isPending },
    );
    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [isEditing, updateMutation.isPending, handleUpdate, showMainButton, hideMainButton]);

  const handleDelete = async () => {
    haptic('medium');
    const ok = await showConfirm("Materialni o'chirishni tasdiqlaysizmi?");
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "O'chirildi");
        navigate('/teacher/assignments');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik');
      },
    });
  };

  if (isLoading || !assignment) {
    return (
      <div className={PAGE}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const item = assignment as any;
  const cat = CATEGORY_META[item.category as AssignmentCategory] ?? CATEGORY_META.LESSON;
  const content = CONTENT_META[item.type as ContentType] ?? CONTENT_META.TEXT;

  return (
    <div className={PAGE}>
      <PageHeader
        title={isEditing ? 'Tahrirlash' : item.title}
        onBack={() => {
          haptic('light');
          navigate('/teacher/assignments');
        }}
        actions={
          !isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  setIsEditing(true);
                }}
                className="p-2 rounded-xl bg-gold/10 text-gold min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Tahrirlash"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-2 rounded-xl bg-red-500/10 text-red-400 min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-50"
                aria-label="O'chirish"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )
        }
      />

      {isEditing ? (
        <div className="bg-surface/30 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h2 className={TEXT.h2}>Tahrirlash</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setIsEditing(false);
              }}
              className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Bekor
            </button>
          </div>

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
              <option value="PDF">PDF</option>
              <option value="VIDEO">YouTube</option>
            </select>
          </Field>

          <Field label="Guruh" required>
            <select
              value={form.selectedGroup}
              onChange={(e) => update('selectedGroup', e.target.value)}
              className={CONTROL.select}
            >
              <option value="">Tanlang...</option>
              {groups?.map((g: any) => (
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
              className={CONTROL.input}
            />
          </Field>

          {form.contentType !== 'TEXT' && (
            <Field label="Media URL">
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
              rows={4}
              className={CONTROL.textarea}
            />
          </Field>
        </div>
      ) : (
        <div className="bg-surface/20 border border-white/5 rounded-2xl p-5 sm:p-7 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold ${cat.cls}`}
              >
                <cat.Icon className="w-3.5 h-3.5" />
                {cat.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold bg-white/5 text-ink-muted">
                <content.Icon className="w-3.5 h-3.5" />
                {content.label}
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
              {item.title}
            </h1>
          </div>

          {item.mediaUrl && (
            <div className="pt-2">
              {item.type === 'VIDEO' ? (
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface/50 border border-white/5">
                  <iframe
                    src={item.mediaUrl
                      .replace('watch?v=', 'embed/')
                      .replace('youtu.be/', 'youtube.com/embed/')}
                    title="YouTube video"
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : item.type === 'IMAGE' ? (
                <div className="rounded-2xl overflow-hidden border border-white/5 max-h-96 bg-surface/30 flex items-center justify-center">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="max-h-96 object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <a
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CONTROL.buttonSubtle}
                >
                  <ExternalLink className="w-4 h-4" />
                  Faylni ochish
                </a>
              )}
            </div>
          )}

          <Section title="Tavsif">
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {item.description || '—'}
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}

export default TeacherAssignmentDetail;