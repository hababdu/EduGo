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
    haptic,
    hapticNotify,
    showConfirm,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
  } = useTelegram();

  const { data: assignment, isLoading } = useTeacherAssignment(id);
  const { data: groups } = useTeacherGroups();

  const updateMutation = useUpdateTeacherAssignment(id);
  const deleteMutation = useDeleteTeacherAssignment();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Ma'lumot kelganda formani to'ldirish
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

  // BackButton — Telegram native
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
      toast('error', 'Sarlavha va guruhni tanlang!');
      return;
    }
    if (form.contentType !== 'TEXT' && !form.mediaUrl.trim()) {
      hapticNotify('error');
      toast('error', 'Media URL kiritilishi shart!');
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
          toast('success', "O'zgarishlar saqlandi");
          setIsEditing(false);
        },
        onError: (error: any) => {
          hapticNotify('error');
          toast('error', error?.message || 'Yangilashda xatolik!');
        },
      }
    );
  }, [form, updateMutation, hapticNotify]);

  // MainButton — faqat tahrirlash rejimida
  useEffect(() => {
    if (!isEditing) {
      hideMainButton();
      return;
    }
    const cleanup = showMainButton(
      updateMutation.isPending ? 'Saqlanmoqda...' : 'SAQLASH',
      handleUpdate,
      { loading: updateMutation.isPending, disabled: updateMutation.isPending }
    );
    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [isEditing, updateMutation.isPending, handleUpdate, showMainButton, hideMainButton]);

  const handleDelete = async () => {
    haptic('medium');
    const ok = await showConfirm(
      "Haqiqatan ham bu materialni oʻchirmoqchimisiz?"
    );
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Material o'chirildi");
        navigate('/teacher/assignments');
      },
      onError: (error: any) => {
        hapticNotify('error');
        toast('error', error?.message || "O'chirishda xatolik!");
      },
    });
  };

  if (isLoading || !assignment) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const item = assignment as any;
  const cat = CATEGORY_META[item.category as AssignmentCategory] ?? CATEGORY_META.LESSON;
  const content = CONTENT_META[item.type as ContentType] ?? CONTENT_META.TEXT;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      {/* Yuqori panel */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            haptic('light');
            navigate('/teacher/assignments');
          }}
          className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-4 py-2.5 rounded-2xl border border-white/5 min-h-[44px]"
        >
          ← Orqaga
        </button>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => {
                haptic('light');
                setIsEditing(true);
              }}
              className="text-xs bg-gold/10 text-gold px-4 py-2.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform min-h-[44px]"
            >
              ✏️ Tahrirlash
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs bg-red-500/10 text-red-400 px-3.5 py-2.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px]"
          >
            {deleteMutation.isPending ? '…' : '🗑'}
          </button>
        </div>
      </div>

      {isEditing ? (
        /* TAHRIRLASH */
        <div className="bg-surface/40 p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-display text-base text-ink">Materialni tahrirlash</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setIsEditing(false);
              }}
              className="text-xs text-ink-muted hover:text-ink px-3 py-2 rounded-xl bg-white/5"
            >
              Bekor qilish
            </button>
          </div>

          <div className="space-y-3">
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

            <Field label="Guruh *">
              <select
                value={form.selectedGroup}
                onChange={(e) => update('selectedGroup', e.target.value)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              >
                <option value="">Guruhni tanlang...</option>
                {groups?.map((g: any) => (
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
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>

            {form.contentType !== 'TEXT' && (
              <Field label="Media URL">
                <input
                  value={form.mediaUrl}
                  onChange={(e) => update('mediaUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
                />
              </Field>
            )}

            <Field label="Tafsilotlar">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </Field>
          </div>

          <p className="text-[10px] text-ink-muted text-center">
            Pastdagi Telegram tugmasi orqali saqlashingiz mumkin
          </p>
        </div>
      ) : (
        /* KO'RISH */
        <div className="bg-surface/20 p-5 sm:p-8 rounded-3xl border border-white/5 space-y-6 backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${cat.badge}`}>
                {cat.label}
              </span>
              <span className="text-xs px-3 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                {content.emoji} {content.label}
              </span>
            </div>

            <h1 className="font-display text-xl sm:text-3xl text-ink break-words">
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
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gold/10 text-gold text-sm font-semibold active:scale-[0.98] transition-transform"
                >
                  🔗 Biriktirilgan faylni ochish →
                </a>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-white/5 pt-6">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Tafsilotlar va ko'rsatmalar
            </h3>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {item.description || 'Tavsif mavjud emas.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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