import { useEffect, useState } from 'react';
import { Download, Eye, Loader2, Send } from '../../design/icons';
import { toast } from '../ui/Toast';
import {
  MaterialFileDto,
  fetchMaterialBlob,
  formatBytes,
  sendMaterialToChat,
} from '../../lib/material-files';
import { FILE_KIND_META } from './fileMeta';

/** Bitta fayl: ko'rish (rasm/video/PDF ilova ichida), yuklab olish, katta bo'lsa — botdan Telegramga yuborish. */
function FileCard({ file }: { file: MaterialFileDto }) {
  const meta = FILE_KIND_META[file.kind];
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tooLarge, setTooLarge] = useState(!file.previewable);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const load = async (): Promise<string | null> => {
    if (url) return url;
    setLoading(true);
    try {
      const blob = await fetchMaterialBlob(file.id);
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return u;
    } catch (e: any) {
      if (e?.tooLarge) setTooLarge(true);
      else toast('error', e?.message || "Faylni ochib bo'lmadi");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    const u = await load();
    if (!u) return;
    const a = document.createElement('a');
    a.href = u;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const sendToChat = async () => {
    setSending(true);
    try {
      await sendMaterialToChat(file.id);
      toast('success', 'Fayl Telegram chatingizga yuborildi');
    } catch (e: any) {
      toast('error', e?.message || 'Yuborib bo\'lmadi');
    } finally {
      setSending(false);
    }
  };

  const previewable = file.kind === 'IMAGE' || file.kind === 'VIDEO' || file.kind === 'PDF';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface/40">
      <div className="flex items-center gap-3 p-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
          <meta.Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{file.fileName}</p>
          <p className="text-[11px] text-ink-muted">
            {meta.label} · {formatBytes(file.sizeBytes)}
          </p>
        </div>
      </div>

      {url && file.kind === 'IMAGE' && <img src={url} alt={file.fileName} className="max-h-[70vh] w-full object-contain bg-black/20" />}
      {url && file.kind === 'VIDEO' && <video src={url} controls playsInline className="w-full bg-black" />}
      {url && file.kind === 'PDF' && <iframe src={url} title={file.fileName} className="h-[70vh] w-full bg-white" />}

      <div className="flex flex-wrap gap-2 border-t border-white/5 p-2.5">
        {tooLarge ? (
          <>
            <p className="w-full px-1 text-[11px] text-ink-muted">
              Fayl 20 MB dan katta — ilova ichida ochilmaydi. Telegram chatingizga yuboramiz.
            </p>
            <button type="button" onClick={sendToChat} disabled={sending} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-base active:scale-[0.98] disabled:opacity-60">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Telegramga yuborish
            </button>
          </>
        ) : (
          <>
            {previewable && !url && (
              <button type="button" onClick={load} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-base active:scale-[0.98] disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Ko'rish
              </button>
            )}
            <button type="button" onClick={download} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-ink active:scale-[0.98] disabled:opacity-60">
              <Download className="h-4 w-4" />
              Yuklab olish
            </button>
            <button type="button" onClick={sendToChat} disabled={sending} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-ink active:scale-[0.98] disabled:opacity-60" title="Telegram chatingizga yuborish">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only sm:not-sr-only">Telegramga</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function MaterialFiles({ files }: { files?: MaterialFileDto[] }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {files.map((f) => (
        <FileCard key={f.id} file={f} />
      ))}
    </div>
  );
}
