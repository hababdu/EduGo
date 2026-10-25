import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface Cert { id: string; code: string; title: string; groupName: string; issuedAt: string }

/** O'quvchi profilida: olingan sertifikatlar. Yo'q bo'lsa ko'rinmaydi. */
export function MyCertificates() {
  const { data } = useQuery({ queryKey: ['certificates', 'mine'], queryFn: () => apiFetch<Cert[]>('/api/v1/certificates/mine'), staleTime: 60_000 });
  if (!data || data.length === 0) return null;
  return (
    <section className="space-y-2 rounded-3xl border border-tint/10 bg-surface/30 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Award className="h-4 w-4 text-gold" aria-hidden="true" />Sertifikatlarim</h3>
      <ul className="divide-y divide-tint/5">
        {data.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{c.title}</p>
              <p className="text-[11px] text-ink-muted">{new Date(c.issuedAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</p>
            </div>
            <a href={`/certificate/${c.code}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-teal">Ochish</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
