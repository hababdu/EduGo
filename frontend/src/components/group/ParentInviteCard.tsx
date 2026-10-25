import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../ui/Toast';

interface Invite { code: string; expiresAt: string; link: string | null }

/** Ota-onani ulash: taklif havolasi yaratadi (7 kun, bir martalik). `studentId` — o'qituvchi/admin uchun. */
export function ParentInviteCard({ studentId }: { studentId?: string }) {
  const [inv, setInv] = useState<Invite | null>(null);
  const create = useMutation({
    mutationFn: () => apiFetch<Invite>('/api/v1/parents/invite', { method: 'POST', data: studentId ? { studentId } : {} }),
    onSuccess: setInv,
    onError: (e: any) => toast('error', e?.message || 'Havola yaratib bo\'lmadi'),
  });
  const text = inv?.link ?? (inv ? `Botga yuboring: /start parent_${inv.code}` : '');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('success', 'Nusxalandi'); } catch { toast('error', "Nusxalab bo'lmadi"); }
  };
  return (
    <section className="space-y-3 rounded-3xl border border-tint/10 bg-surface/30 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Users className="h-4 w-4 text-teal" aria-hidden="true" />Ota-onani ulash</h3>
      <p className="text-xs text-ink-muted">Ota-ona havolani Telegramda ochsa, davomat, vazifa va to'lov haqida xabar oladi.</p>
      {!inv ? (
        <button type="button" disabled={create.isPending} onClick={() => create.mutate()} className="w-full rounded-xl bg-teal/15 py-2.5 text-sm font-semibold text-teal disabled:opacity-50">
          {create.isPending ? 'Yaratilmoqda…' : 'Taklif havolasini yaratish'}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="break-all rounded-xl bg-surface/60 p-3 text-xs text-ink">{text}</p>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="flex-1 rounded-xl bg-gold py-2 text-sm font-semibold text-base">Nusxalash</button>
            {inv.link && (
              <a href={`https://t.me/share/url?url=${encodeURIComponent(inv.link)}&text=${encodeURIComponent("EduGo: farzandimning natijalarini kuzatish uchun ulaning")}`} target="_blank" rel="noreferrer"
                className="flex-1 rounded-xl bg-sky/15 py-2 text-center text-sm font-semibold text-sky">Yuborish</a>
            )}
          </div>
          <p className="text-[11px] text-ink-faint">Havola 7 kun amal qiladi va bir marta ishlatiladi.</p>
        </div>
      )}
    </section>
  );
}
