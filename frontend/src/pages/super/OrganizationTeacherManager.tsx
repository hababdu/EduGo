import { useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Panel, Avatar } from '../../components/staff';
import { CONTROL } from '../../design/tokens';
import { sapi, useCandidates, useSuperMutation } from './superApi';

export function OrganizationTeacherManager({ organizationId }: { organizationId: string }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isFetching } = useCandidates(search.trim(), open && search.trim().length >= 2);
  const attach = useSuperMutation(sapi.attachTeacher, 'O‘qituvchi tashkilotga biriktirildi');
  return (
    <Panel title="O‘qituvchilarni biriktirish" icon={Users} accent="sky">
      <div className="space-y-2">
        <button className={CONTROL.buttonSubtle + ' w-full'} onClick={() => setOpen((value) => !value)}><UserPlus className="h-4 w-4" /> O‘qituvchi qo‘shish</button>
        {open && (
          <div className="space-y-2 rounded-xl bg-surface/50 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input autoFocus className={CONTROL.input + ' pl-9'} placeholder="Ism yoki username..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search.trim().length < 2 ? <p className="p-2 text-xs text-ink-muted">Kamida 2 ta belgi kiriting.</p> : (
              <ul className="max-h-64 divide-y divide-tint/5 overflow-y-auto">
                {candidates.map((candidate) => {
                  const existing = candidate.memberships?.find((membership) => membership.organization.id === organizationId);
                  const isTeacher = existing?.role === 'TEACHER';
                  return (
                    <li key={candidate.id} className="flex items-center gap-2 py-2">
                      <Avatar name={candidate.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{candidate.name}</div>
                        <div className="truncate text-[11px] text-ink-muted">{candidate.username ? '@' + candidate.username : candidate.role}{existing ? ' · ' + existing.role : ''}</div>
                      </div>
                      <button disabled={!!existing || attach.isPending} className="rounded-lg bg-teal/15 px-2.5 py-1.5 text-[11px] font-semibold text-teal disabled:opacity-40"
                        onClick={() => attach.mutate({ organizationId, userId: candidate.id })}>{isTeacher ? 'Biriktirilgan' : existing ? 'A’zolik bor' : 'Biriktirish'}</button>
                    </li>
                  );
                })}
                {!candidates.length && !isFetching && <li className="p-3 text-center text-xs text-ink-muted">Foydalanuvchi topilmadi.</li>}
                {isFetching && <li className="p-3 text-center text-xs text-ink-muted">Qidirilmoqda…</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
