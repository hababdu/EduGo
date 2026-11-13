import { useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Panel } from '../../components/staff';
import { CONTROL } from '../../design/tokens';
import { branchApi, useOrganizationBranches, useSuperMutation } from './superApi';

export function OrganizationBranchManager({ organizationId }: { organizationId: string }) {
  const { data: branches = [] } = useOrganizationBranches(organizationId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', code: '', city: '', address: '', phone: '', email: '', isMain: false, isActive: true });
  const create = useSuperMutation(branchApi.create, 'Filial yaratildi');
  const update = useSuperMutation(branchApi.update, 'Filial yangilandi');
  const remove = useSuperMutation(branchApi.remove, 'Filial o‘chirildi');
  const reset = () => { setEditing(null); setDraft({ name: '', code: '', city: '', address: '', phone: '', email: '', isMain: false, isActive: true }); };
  const save = () => {
    if (!draft.name.trim()) return;
    if (editing) update.mutate({ id: editing, ...draft }, { onSuccess: reset });
    else create.mutate({ organizationId, ...draft }, { onSuccess: reset });
  };
  return (
    <Panel title="Filiallar va kampuslar" icon={MapPin} accent="teal">
      <div className="space-y-2">
        <input className={CONTROL.input} placeholder="Filial nomi" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={CONTROL.input} placeholder="Kod" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <input className={CONTROL.input} placeholder="Shahar" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
        </div>
        <input className={CONTROL.input} placeholder="Manzil" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={CONTROL.input} placeholder="Telefon" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <input className={CONTROL.input} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </div>
        <div className="flex gap-4 text-xs text-ink-muted">
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isMain} onChange={(e) => setDraft({ ...draft, isMain: e.target.checked })} /> Asosiy filial</label>
          {editing && <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Faol</label>}
        </div>
        <div className="flex gap-2">
          <button className={CONTROL.buttonPrimary + ' flex-1'} disabled={!draft.name.trim() || create.isPending || update.isPending} onClick={save}><Save className="h-4 w-4" /> {editing ? 'Saqlash' : 'Filial qo‘shish'}</button>
          {editing && <button className={CONTROL.buttonSubtle} onClick={reset}>Bekor</button>}
        </div>
        <div className="divide-y divide-tint/5">
          {branches.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{item.name}{item.isMain ? ' · Asosiy' : ''}</div>
                <div className="truncate text-[11px] text-ink-muted">{item.city || ''}{item.address ? ' · ' + item.address : ''}{!item.isActive ? ' · Nofaol' : ''}</div>
              </div>
              <button className="rounded-lg bg-surface px-2 py-1 text-[11px] text-ink-muted" onClick={() => { setEditing(item.id); setDraft({ name: item.name, code: item.code || '', city: item.city || '', address: item.address || '', phone: item.phone || '', email: item.email || '', isMain: item.isMain, isActive: item.isActive }); }}>Tahrir</button>
              <button className="rounded-lg bg-coral/10 px-2 py-1 text-[11px] text-coral" onClick={() => { if (window.confirm('«' + item.name + '» filiali o‘chirilsinmi?')) remove.mutate(item.id); }}>O‘chirish</button>
            </div>
          ))}
          {branches.length === 0 && <p className="py-3 text-xs text-ink-muted">Hozircha filiallar qo‘shilmagan.</p>}
        </div>
      </div>
    </Panel>
  );
}
