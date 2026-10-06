// src/pages/teacher/content/TeacherAssignmentDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTeacherAssignment,
  useUpdateTeacherAssignment,
  useDeleteTeacherAssignment,
  useTeacherGroups,
} from '../../../hooks/useTeacherAssignments';
import type { AssignmentCategory, ContentType } from '../../../hooks/useTeacherAssignments';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { CATEGORY_META, CONTENT_META } from '../../../constants/assignment';
import { Field, Skeleton } from '../../../components/ui';
import { Panel, StaffHero, ProgressBar, Avatar } from '../../../components/staff';
import { MaterialFiles } from '../../../components/materials/MaterialFiles';
import { FileUploader } from '../../../components/materials/FileUploader';
import { Edit3, Trash2, ExternalLink, X, Rocket, EyeOff, Eye, Calendar, ChevronLeft, Save } from '../../../design/icons';
import { CONTROL, PAGE } from '../../../design/tokens';
import { IMAGES } from '../../../design/images';
import { isHttpUrl, youtubeEmbed } from '../../../lib/safe-url';
import { deleteMaterialFile, type MaterialFileDto } from '../../../lib/material-files';

const CATS: { key: AssignmentCategory; label: string }[] = [
  { key: 'LESSON', label: 'Dars mavzusi' },
  { key: 'HOMEWORK', label: 'Uy vazifasi' },
  { key: 'RESOURCE', label: "Qo'shimcha" },
];

function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  // Toshkent kalendar kuni (UTC+5)
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return d.toISOString().slice(0, 10);
}

function personName(v: { firstName?: string | null; lastName?: string | null; username?: string | null }) {
  return `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim() || v.username || "Noma'lum";
}

export function TeacherAssignmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm, showBackButton, hideBackButton } = useTelegram();

  const { data: assignment, isLoading } = useTeacherAssignment(id);
  const { data: groups } = useTeacherGroups();
  const updateMutation = useUpdateTeacherAssignment(id);
  const deleteMutation = useDeleteTeacherAssignment();

  const [isEditing, setIsEditing] = useState(false);
  const [category, setCategory] = useState<AssignmentCategory>('LESSON');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'VIDEO' | 'PDF' | 'IMAGE'>('VIDEO');
  const [groupId, setGroupId] = useState('');
  const [due, setDue] = useState('');
  const [files, setFiles] = useState<MaterialFileDto[]>([]);
  const [uploading, setUploading] = useState(false);

  const item = assignment as any;
  const originalFileIds = useMemo(() => new Set<string>((item?.files ?? []).map((f: any) => f.id)), [item]);

  const loadForm = () => {
    if (!item) return;
    setCategory(item.category || 'LESSON');
    setTitle(item.title || '');
    setDescription(item.description || '');
    setMediaUrl(item.mediaUrl || '');
    setMediaType(['VIDEO', 'PDF', 'IMAGE'].includes(item.type) ? item.type : 'VIDEO');
    setGroupId(item.groupId || '');
    setDue(toDateInput(item.dueAt));
    setFiles(item.files ?? []);
  };

  useEffect(() => {
    if (!isEditing) loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, isEditing]);

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

  const save = (extra: { status?: 'DRAFT' | 'PUBLISHED' } = {}) => {
    if (uploading) return toast('error', "Fayllar yuklanib bo'lishini kuting");
    if (!title.trim() || !groupId) {
      hapticNotify('error');
      return toast('error', 'Sarlavha va guruh kerak');
    }
    if (mediaUrl.trim() && !isHttpUrl(mediaUrl)) {
      hapticNotify('error');
      return toast('error', 'Havola https:// bilan boshlanishi kerak');
    }
    const type: ContentType = files.length ? files[0].kind : mediaUrl.trim() ? mediaType : 'TEXT';
    updateMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type,
        category,
        groupId,
        mediaUrl: mediaUrl.trim(),
        fileIds: files.map((f) => f.id),
        dueAt: due ? `${due}T23:59:00+05:00` : null,
        ...extra,
      },
      {
        onSuccess: () => {
          hapticNotify('success');
          setIsEditing(false);
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || 'Xatolik');
        },
      },
    );
  };

  const setStatus = (status: 'DRAFT' | 'PUBLISHED') => {
    haptic('light');
    updateMutation.mutate(
      { status },
      {
        onSuccess: () => toast('success', status === 'PUBLISHED' ? "E'lon qilindi, o'quvchilarga xabar yuborildi" : 'Qoralamaga qaytarildi'),
      },
    );
  };

  const cancelEdit = () => {
    haptic('light');
    // Tahrirlash vaqtida yangi yuklanib, saqlanmagan fayllarni tozalaymiz
    files.filter((f) => !originalFileIds.has(f.id)).forEach((f) => void deleteMaterialFile(f.id).catch(() => undefined));
    setIsEditing(false);
  };

  const handleDelete = async () => {
    haptic('medium');
    const ok = await showConfirm("Materialni o'chirishni tasdiqlaysizmi?");
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        hapticNotify('success');
        navigate('/teacher/assignments');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.message || 'Xatolik');
      },
    });
  };

  if (isLoading || !item) {
    return (
      <div className={PAGE}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const cat = CATEGORY_META[item.category as AssignmentCategory] ?? CATEGORY_META.LESSON;
  const content = CONTENT_META[item.type as ContentType] ?? CONTENT_META.TEXT;
  const isDraft = item.status === 'DRAFT';
  const stats = item.stats as { viewed: number; total: number } | undefined;
  const viewers = (item.viewers ?? []) as NonNullable<typeof item.viewers>;
  const embed = item.type === 'VIDEO' && isHttpUrl(item.mediaUrl) ? youtubeEmbed(item.mediaUrl) : null;

  const hero = (
    <StaffHero
      eyebrow={isEditing ? 'TAHRIRLASH' : `${cat.label.toUpperCase()}${item.group ? ` · ${item.group.name}` : ''}`}
      title={isEditing ? 'Materialni tahrirlash' : item.title}
      image={IMAGES.hero}
      accent={isDraft ? 'sky' : 'teal'}
      top={
        <button
          type="button"
          onClick={() => {
            haptic('light');
            navigate('/teacher/assignments');
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-ink-muted hover:text-ink active:scale-95 transition"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      }
      actions={
        !isEditing && (
          <>
            <button type="button" onClick={() => { haptic('light'); loadForm(); setIsEditing(true); }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold" aria-label="Tahrirlash">
              <Edit3 className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400 disabled:opacity-50" aria-label="O'chirish">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )
      }
    />
  );

  if (isEditing) {
    return (
      <div className={PAGE}>
        {hero}
        <div className="space-y-5 rounded-3xl border border-white/10 bg-surface/40 p-5">
          <Field label="Toifa">
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={`${CONTROL.chip} ${category === c.key ? CONTROL.chipActive : CONTROL.chipInactive}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Guruh" required>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={CONTROL.select}>
              <option value="">Tanlang...</option>
              {groups?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sarlavha" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={CONTROL.input} />
          </Field>
          <Field label="Tavsif / ko'rsatma">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} className={CONTROL.textarea} />
          </Field>
          <Field label="Fayllar">
            <FileUploader
              files={files}
              onChange={setFiles}
              onBusyChange={setUploading}
              // Allaqachon biriktirilgan faylni olib tashlash faqat "Saqlash" bosilganda kuchga kiradi
              deleteOnRemove={(f) => !originalFileIds.has(f.id)}
            />
          </Field>
          <Field label="Havola (ixtiyoriy)">
            <div className="space-y-2">
              <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." inputMode="url" className={CONTROL.input} />
              {mediaUrl.trim() && files.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {(['VIDEO', 'PDF', 'IMAGE'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setMediaType(t)} className={`${CONTROL.chip} ${mediaType === t ? CONTROL.chipActive : CONTROL.chipInactive}`}>
                      {t === 'VIDEO' ? 'Video (YouTube)' : t === 'PDF' ? 'PDF' : 'Rasm'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Muddat">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${CONTROL.input} pl-9`} />
              </div>
              {due && (
                <button type="button" onClick={() => setDue('')} className="rounded-xl bg-white/5 p-3 text-ink-muted" aria-label="Muddatni olib tashlash">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={cancelEdit} className={`${CONTROL.buttonGhost} flex-1`}>Bekor</button>
            <button type="button" disabled={updateMutation.isPending || uploading} onClick={() => save()} className={`${CONTROL.buttonPrimary} flex-1 disabled:opacity-50`}>
              <Save className="h-4 w-4" /> {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      {hero}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${cat.cls}`}>
          <cat.Icon className="h-3.5 w-3.5" /> {cat.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-ink-muted">
          <content.Icon className="h-3.5 w-3.5" /> {content.label}
        </span>
        {item.dueAt && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
            <Calendar className="h-3.5 w-3.5" /> {new Date(item.dueAt).toLocaleDateString('uz-UZ')} gacha
          </span>
        )}
      </div>

      {/* Holat: qoralama / e'lon qilingan */}
      <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${isDraft ? 'border-coral/30 bg-coral/10' : 'border-teal/20 bg-teal/10'}`}>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${isDraft ? 'text-coral' : 'text-teal'}`}>{isDraft ? 'Qoralama' : "E'lon qilingan"}</p>
          <p className="text-[11px] text-ink-muted">
            {isDraft ? "O'quvchilar hali ko'rmaydi" : "Guruh o'quvchilariga ko'rinadi"}
          </p>
        </div>
        <button
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => setStatus(isDraft ? 'PUBLISHED' : 'DRAFT')}
          className={`${isDraft ? CONTROL.buttonPrimary : CONTROL.buttonGhost} shrink-0 disabled:opacity-50`}
        >
          {isDraft ? <Rocket className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {isDraft ? "E'lon qilish" : 'Yashirish'}
        </button>
      </div>

      {item.description && (
        <Panel title="Tavsif / ko'rsatma" icon={Edit3} accent="gold">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.description}</p>
        </Panel>
      )}

      {(item.files?.length > 0 || item.mediaUrl) && (
        <Panel title="Material" icon={Eye} accent="sky">
          <div className="space-y-3">
            <MaterialFiles files={item.files} />
            {embed ? (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-surface/50">
                <iframe src={embed} title="YouTube video" className="h-full w-full" allowFullScreen />
              </div>
            ) : (
              isHttpUrl(item.mediaUrl) && (
                <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className={CONTROL.buttonSubtle}>
                  <ExternalLink className="h-4 w-4" /> Havolani ochish
                </a>
              )
            )}
          </div>
        </Panel>
      )}

      {/* Ko'rilganlik */}
      {!isDraft && stats && stats.total > 0 && (
        <Panel title={`Ko'rilganlik: ${stats.viewed}/${stats.total}`} icon={Eye} accent="teal">
          <ProgressBar value={Math.round((stats.viewed / stats.total) * 100)} tone="teal" />
          <ul className="mt-3 divide-y divide-white/5">
            {[...viewers].sort((a: any, b: any) => Number(!!a.viewedAt) - Number(!!b.viewedAt)).map((v: any) => (
              <li key={v.studentId} className="flex items-center gap-3 py-2">
                <Avatar name={personName(v)} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{personName(v)}</span>
                {v.viewedAt ? (
                  <span className="text-[11px] text-teal">{new Date(v.viewedAt).toLocaleDateString('uz-UZ')}</span>
                ) : (
                  <span className="rounded-md bg-coral/10 px-2 py-0.5 text-[11px] font-semibold text-coral">Ochmagan</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export default TeacherAssignmentDetail;
