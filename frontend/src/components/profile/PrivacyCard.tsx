import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../ui/Toast';

/** Maxfiylik: ma'lumotni yuklab olish va hisobni o'chirish (faqat o'quvchi/ota-ona). */
export function PrivacyCard() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const data = await apiFetch('/api/v1/users/me/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'edugo-malumotlarim.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      toast('error', e?.message || "Yuklab bo'lmadi");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch('/api/v1/users/me/delete', { method: 'POST', data: { confirm: 'DELETE' } });
      useAuthStore.getState().clearSession();
      window.location.href = '/';
    } catch (e: any) {
      toast('error', e?.message || "O'chirib bo'lmadi");
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-3xl border border-tint/10 bg-surface/30 p-4">
      <h3 className="text-sm font-semibold text-ink">Maxfiylik</h3>
      <button type="button" onClick={download} disabled={busy} className="flex w-full items-center gap-2 rounded-xl bg-tint/5 px-3 py-2.5 text-left text-sm text-ink disabled:opacity-50">
        <Download className="h-4 w-4 text-teal" aria-hidden="true" />Ma'lumotlarimni yuklab olish (JSON)
      </button>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-coral">
          <Trash2 className="h-4 w-4" aria-hidden="true" />Hisobimni o'chirish
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-coral/30 bg-coral/10 p-3">
          <p className="text-xs text-ink">Ismingiz, telefoningiz va javoblaringiz o'chiriladi, hisobingizga qayta kirib bo'lmaydi. Bu qaytarilmaydi.</p>
          <div className="flex gap-2">
            <button type="button" onClick={remove} disabled={busy} className="rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-base disabled:opacity-50">Ha, o'chirish</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg bg-surface px-3 py-1.5 text-xs text-ink-muted">Bekor</button>
          </div>
        </div>
      )}
    </section>
  );
}
