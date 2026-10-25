import { useState } from 'react';
import { Download } from 'lucide-react';
import { apiFetchRaw, throwApiError } from '../../lib/api-client';
import { toast } from '../ui/Toast';

/** Oylik hisobotni (to'lov + davomat) Excel qilib yuklab oladi. */
export function ReportDownload({ month }: { month: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await apiFetchRaw(`/api/v1/reports/monthly?month=${month}`);
      if (!res.ok) await throwApiError(res);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisobot_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      toast('error', e?.message || "Hisobotni yuklab bo'lmadi");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={run} disabled={busy}
      className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal/15 px-3 py-2 text-xs font-semibold text-teal active:scale-95 disabled:opacity-50">
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {busy ? 'Tayyorlanmoqda…' : 'Excel'}
    </button>
  );
}
