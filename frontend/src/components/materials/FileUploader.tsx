import { useEffect, useRef, useState } from 'react';
import { Upload, X, ChevronRight, Loader2, AlertTriangle } from '../../design/icons';
import {
  ACCEPT,
  MAX_UPLOAD_MB,
  MaterialFileDto,
  deleteMaterialFile,
  formatBytes,
  uploadMaterialFile,
} from '../../lib/material-files';
import { FILE_KIND_META } from './fileMeta';

const MAX_FILES = 10;

interface Pending {
  key: string;
  name: string;
  pct: number;
  error?: string;
}

interface Props {
  files: MaterialFileDto[];
  onChange: (files: MaterialFileDto[]) => void;
  disabled?: boolean;
  /** Fayl o'chirilganda serverdagi yuklamani ham o'chirish (faqat hali biriktirilmaganlar uchun xavfsiz) */
  deleteOnRemove?: (f: MaterialFileDto) => boolean;
  /** Yuklash jarayoni bor/yo'qligini ota komponentga bildiradi (saqlashni bloklash uchun) */
  onBusyChange?: (busy: boolean) => void;
}

/** Fayl tanlash/tashlash + har bir fayl uchun yuklash progressi. */
export function FileUploader({ files, onChange, disabled, deleteOnRemove, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Parallel yuklashda onChange eskirgan `files` bilan ishlamasligi uchun
  const filesRef = useRef(files);
  filesRef.current = files;

  const busy = pending.some((p) => !p.error);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const startUpload = async (picked: File[]) => {
    const room = MAX_FILES - filesRef.current.length - pending.length;
    const list = picked.slice(0, Math.max(0, room));
    for (const file of list) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setPending((p) => [...p, { key, name: file.name, pct: 0 }]);
      try {
        const dto = await uploadMaterialFile(file, (pct) =>
          setPending((p) => p.map((x) => (x.key === key ? { ...x, pct } : x))),
        );
        setPending((p) => p.filter((x) => x.key !== key));
        filesRef.current = [...filesRef.current, dto];
        onChange(filesRef.current);
      } catch (e: any) {
        setPending((p) => p.map((x) => (x.key === key ? { ...x, error: e?.message || 'Xatolik' } : x)));
      }
    }
  };

  const remove = (f: MaterialFileDto) => {
    filesRef.current = filesRef.current.filter((x) => x.id !== f.id);
    onChange(filesRef.current);
    if (deleteOnRemove?.(f) ?? true) void deleteMaterialFile(f.id).catch(() => undefined);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    filesRef.current = next;
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) void startUpload(Array.from(e.dataTransfer.files));
        }}
        className={`rounded-2xl border border-dashed p-4 text-center transition ${
          dragOver ? 'border-gold bg-gold/10' : 'border-white/15 bg-surface/30'
        }`}
      >
        <button
          type="button"
          disabled={disabled || files.length + pending.length >= MAX_FILES}
          onClick={() => inputRef.current?.click()}
          className="mx-auto flex flex-col items-center gap-1.5 disabled:opacity-50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/10 text-gold">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-ink">Fayl tanlash</span>
          <span className="text-[11px] text-ink-muted">
            PDF, rasm, video, Word/PowerPoint/Excel · bittasi {MAX_UPLOAD_MB} MB gacha · {MAX_FILES} tagacha
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (picked.length) void startUpload(picked);
          }}
        />
      </div>

      {files.map((f, i) => {
        const meta = FILE_KIND_META[f.kind];
        return (
          <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/40 p-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
              <meta.Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{f.fileName}</p>
              <p className="text-[11px] text-ink-muted">
                {meta.label} · {formatBytes(f.sizeBytes)}
                {!f.previewable && ' · 20 MB dan katta: o\'quvchiga Telegram orqali yuboriladi'}
              </p>
            </div>
            {files.length > 1 && (
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label="Yuqoriga" disabled={i === 0} onClick={() => move(i, -1)} className="p-0.5 text-ink-muted disabled:opacity-30">
                  <ChevronRight className="h-4 w-4 -rotate-90" />
                </button>
                <button type="button" aria-label="Pastga" disabled={i === files.length - 1} onClick={() => move(i, 1)} className="p-0.5 text-ink-muted disabled:opacity-30">
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label="Faylni olib tashlash"
              disabled={disabled}
              onClick={() => remove(f)}
              className="shrink-0 rounded-lg bg-red-500/10 p-2 text-red-400 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {pending.map((p) => (
        <div key={p.key} className="rounded-2xl border border-white/10 bg-surface/40 p-3">
          <div className="flex items-center gap-2">
            {p.error ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-coral" />
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" />
            )}
            <p className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</p>
            {p.error ? (
              <button type="button" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))} aria-label="Yopish">
                <X className="h-4 w-4 text-ink-muted" />
              </button>
            ) : (
              <span className="text-xs tabular-nums text-ink-muted">{p.pct === 100 ? 'Telegramga saqlanmoqda…' : `${p.pct}%`}</span>
            )}
          </div>
          {p.error ? (
            <p className="mt-1 text-xs text-coral">{p.error}</p>
          ) : (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${p.pct}%` }} />
            </div>
          )}
        </div>
      ))}
      {busy && <p className="text-[11px] text-ink-muted">Yuklash tugaguncha saqlash tugmasini bosmang.</p>}
    </div>
  );
}

