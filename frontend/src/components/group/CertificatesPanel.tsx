import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../ui/Toast';

interface Cert { id: string; code: string; studentId: string; studentName: string; title: string; issuedAt: string; revokedAt: string | null }

/** O'qituvchi/admin: guruh o'quvchisiga sertifikat berish va berilganlarini ko'rish. */
export function CertificatesPanel({ groupId, students }: { groupId: string; students: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const key = ['certificates', groupId];
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const { data = [] } = useQuery({ queryKey: key, queryFn: () => apiFetch<Cert[]>(`/api/v1/certificates?groupId=${groupId}`), staleTime: 30_000 });
  const issue = useMutation({
    mutationFn: () => apiFetch('/api/v1/certificates', { method: 'POST', data: { studentId, groupId, title: title.trim() || undefined } }),
    onSuccess: () => { toast('success', 'Sertifikat berildi 🎓'); setTitle(''); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/certificates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
  const inputCls = 'min-h-[44px] w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60';
  return (
    <section className="space-y-3 rounded-3xl border border-tint/10 bg-surface/30 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Award className="h-4 w-4 text-gold" aria-hidden="true" />Sertifikatlar</h3>
      <div className="space-y-2">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls}>
          <option value="">O'quvchini tanlang…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="Matn (ixtiyoriy): masalan, Ingliz tili B1 kursini tugatdi" className={inputCls} />
        <button type="button" disabled={!studentId || issue.isPending} onClick={() => issue.mutate()} className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">
          {issue.isPending ? 'Berilmoqda…' : 'Sertifikat berish'}
        </button>
      </div>
      {data.length > 0 && (
        <ul className="divide-y divide-tint/5">
          {data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className={`truncate text-sm ${c.revokedAt ? 'text-ink-faint line-through' : 'text-ink'}`}>{c.studentName}</p>
                <p className="truncate text-[11px] text-ink-muted">{c.title}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs font-semibold">
                <a href={`/certificate/${c.code}`} target="_blank" rel="noreferrer" className="text-teal">Ko'rish</a>
                {!c.revokedAt && <button type="button" onClick={() => { if (window.confirm('Sertifikatni bekor qilasizmi?')) revoke.mutate(c.id); }} className="text-coral">Bekor</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
