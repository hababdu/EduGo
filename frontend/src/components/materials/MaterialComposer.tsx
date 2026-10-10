import { toTashkentIso } from '../../lib/due';
import { useState } from 'react';
import { Check, Save, Rocket, Sparkles, X, Calendar } from '../../design/icons';
import { CONTROL } from '../../design/tokens';
import { Field } from '../ui';
import { toast } from '../ui/Toast';
import { useTelegram } from '../../hooks/useTelegram';
import { useCreateTeacherAssignment } from '../../hooks/useTeacherAssignments';
import type { AssignmentCategory, ContentType, MaterialStatus } from '../../hooks/useTeacherAssignments';
import { AIMaterialGenerator } from '../ai/AIMaterialGenerator';
import type { GeneratedMaterial } from '../../lib/ai-service';
import { MaterialFileDto, deleteMaterialFile } from '../../lib/material-files';
import { FileUploader } from './FileUploader';

interface GroupLite {
  id: string;
  name: string;
}

const CATEGORIES: { key: AssignmentCategory; label: string }[] = [
  { key: 'LESSON', label: 'Dars mavzusi' },
  { key: 'HOMEWORK', label: 'Uy vazifasi' },
  { key: 'RESOURCE', label: "Qo'shimcha" },
];

const LINK_TYPES: { key: Exclude<ContentType, 'TEXT' | 'FILE'>; label: string }[] = [
  { key: 'VIDEO', label: 'Video (YouTube)' },
  { key: 'PDF', label: 'PDF' },
  { key: 'IMAGE', label: 'Rasm' },
];


interface Props {
  groups: GroupLite[];
  defaultGroupId?: string;
  onDone: () => void;
  onCancel: () => void;
}

export function MaterialComposer({ groups, defaultGroupId, onDone, onCancel }: Props) {
  const { haptic, hapticNotify } = useTelegram();
  const create = useCreateTeacherAssignment();

  const [category, setCategory] = useState<AssignmentCategory>('LESSON');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<MaterialFileDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState('');
  const [linkType, setLinkType] = useState<'VIDEO' | 'PDF' | 'IMAGE'>('VIDEO');
  const [groupIds, setGroupIds] = useState<string[]>(defaultGroupId ? [defaultGroupId] : []);
  const [due, setDue] = useState('');
  const [showAI, setShowAI] = useState(false);

  const toggleGroup = (id: string) =>
    setGroupIds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const handleAI = (r: GeneratedMaterial) => {
    setTitle(r.title);
    setDescription(r.description);
    setLink(r.youtubeSearchUrl);
    setLinkType('VIDEO');
    hapticNotify('success');
    toast('success', 'AI material tanlandi');
  };

  const submit = (status: MaterialStatus) => {
    if (uploading) return toast('error', 'Fayllar yuklanib bo\'lishini kuting');
    if (!title.trim()) return fail('Sarlavhani kiriting');
    if (groupIds.length === 0) return fail('Kamida bitta guruhni tanlang');
    if (link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) return fail('Havola https:// bilan boshlanishi kerak');

    const hasFiles = files.length > 0;
    const hasLink = !!link.trim();
    const type: ContentType = hasFiles ? files[0].kind : hasLink ? linkType : 'TEXT';

    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        category,
        mediaUrl: hasLink ? link.trim() : undefined,
        groupIds,
        fileIds: hasFiles ? files.map((f) => f.id) : undefined,
        status,
        dueAt: due ? toTashkentIso(due) : undefined,
      },
      {
        onSuccess: (created) => {
          hapticNotify('success');
          toast(
            'success',
            status === 'DRAFT'
              ? 'Qoralama saqlandi'
              : created.length > 1
                ? `${created.length} ta guruhga e'lon qilindi`
                : "Material e'lon qilindi",
          );
          onDone();
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  const fail = (msg: string) => {
    hapticNotify('error');
    toast('error', msg);
  };

  const cancel = () => {
    haptic('light');
    // Yuklangan, lekin saqlanmagan fayllarni tozalaymiz (Telegram xotirasini va limitni band qilmasligi uchun)
    files.forEach((f) => void deleteMaterialFile(f.id).catch(() => undefined));
    onCancel();
  };

  const pending = create.isPending;

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-surface/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Yangi material</h2>
        <button type="button" onClick={cancel} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
          <X className="h-4 w-4" /> Bekor qilish
        </button>
      </div>

      <button type="button" onClick={() => { haptic('light'); setShowAI(true); }} className={`${CONTROL.buttonSubtle} w-full`}>
        <Sparkles className="h-4 w-4" /> AI bilan material yaratish
      </button>

      <Field label="Toifa">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`${CONTROL.chip} ${category === c.key ? CONTROL.chipActive : CONTROL.chipInactive}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Sarlavha" required>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Masalan: 3-mavzu uyga vazifa" className={CONTROL.input} />
      </Field>

      <Field label="Tavsif / ko'rsatma">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="O'quvchilar uchun ko'rsatmalar..." className={CONTROL.textarea} />
      </Field>

      <Field label="Fayllar (qo'llanma, rasm, video)">
        <FileUploader files={files} onChange={setFiles} onBusyChange={setUploading} disabled={pending} />
      </Field>

      <Field label="Yoki havola (ixtiyoriy)">
        <div className="space-y-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/..." className={CONTROL.input} inputMode="url" />
          {link.trim() && files.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {LINK_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setLinkType(t.key)}
                  className={`${CONTROL.chip} ${linkType === t.key ? CONTROL.chipActive : CONTROL.chipInactive}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-muted">Uzun video uchun YouTube/Drive havolasi qulayroq — fayl 45 MB dan oshmasligi kerak.</p>
        </div>
      </Field>

      <Field label="Qaysi guruhlarga?" required>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => {
            const on = groupIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`${CONTROL.chip} inline-flex items-center gap-1 ${on ? CONTROL.chipActive : CONTROL.chipInactive}`}
                aria-pressed={on}
              >
                {on && <Check className="h-3 w-3" />}
                {g.name}
              </button>
            );
          })}
          {groups.length > 1 && (
            <button
              type="button"
              onClick={() => setGroupIds(groupIds.length === groups.length ? [] : groups.map((g) => g.id))}
              className="px-2 text-xs font-semibold text-gold"
            >
              {groupIds.length === groups.length ? 'Hammasini olib tashlash' : 'Hammasini tanlash'}
            </button>
          )}
        </div>
      </Field>

      <Field label={category === 'HOMEWORK' ? 'Topshirish muddati' : 'Muddat (ixtiyoriy)'}>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={`${CONTROL.input} pl-9`} />
        </div>
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={pending || uploading} onClick={() => submit('DRAFT')} className={`${CONTROL.buttonGhost} flex-1 disabled:opacity-50`}>
          <Save className="h-4 w-4" /> Qoralama
        </button>
        <button type="button" disabled={pending || uploading} onClick={() => submit('PUBLISHED')} className={`${CONTROL.buttonPrimary} flex-1 disabled:opacity-50`}>
          <Rocket className="h-4 w-4" />
          {pending ? 'Saqlanmoqda...' : groupIds.length > 1 ? `${groupIds.length} guruhga e'lon qilish` : "E'lon qilish"}
        </button>
      </div>

      <AIMaterialGenerator isOpen={showAI} onClose={() => setShowAI(false)} initialCategory={category} onAccept={handleAI} />
    </div>
  );
}
