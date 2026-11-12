import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Panel } from '../../components/staff';
import { CONTROL } from '../../design/tokens';
import { membershipPermissionApi, useSuperMutation } from './superApi';

const PERMISSIONS = [
  ['branches.manage', 'Filiallarni boshqarish'],
  ['organization.settings.manage', 'Tashkilot sozlamalari'],
  ['memberships.read', 'A’zolarni ko‘rish'],
  ['memberships.manage', 'A’zolarni biriktirish'],
  ['memberships.permissions.manage', 'Ruxsatlarni boshqarish'],
  ['students.read', 'O‘quvchilarni ko‘rish'],
  ['students.manage', 'O‘quvchilarni boshqarish'],
  ['teachers.read', 'O‘qituvchilarni ko‘rish'],
  ['teachers.manage', 'O‘qituvchilarni boshqarish'],
  ['courses.manage', 'Kurslarni boshqarish'],
  ['groups.manage', 'Guruhlarni boshqarish'],
  ['lessons.manage', 'Darslarni boshqarish'],
  ['materials.manage', 'Materiallarni boshqarish'],
  ['assignments.review', 'Topshiriqlarni tekshirish'],
  ['tests.manage', 'Testlarni boshqarish'],
  ['attendance.manage', 'Davomatni boshqarish'],
  ['grading.manage', 'Baholashni boshqarish'],
  ['payments.read', 'To‘lovlarni ko‘rish'],
  ['payments.manage', 'To‘lovlarni boshqarish'],
  ['analytics.read', 'Analitikani ko‘rish'],
  ['certificates.manage', 'Sertifikatlarni boshqarish'],
  ['messaging.manage', 'Xabarlarni boshqarish'],
] as const;

type Member = { membershipId: string; name: string; permissions: { allow?: string[]; deny?: string[] } | null };

export function OrganizationPermissionsManager({ members }: { members: Member[] }) {
  const [selectedId, setSelectedId] = useState('');
  const [allow, setAllow] = useState<string[]>([]);
  const [deny, setDeny] = useState<string[]>([]);
  const selected = useMemo(() => members.find((member) => member.membershipId === selectedId), [members, selectedId]);
  const save = useSuperMutation(membershipPermissionApi.update, 'Tashkilot ruxsatlari saqlandi');

  useEffect(() => {
    if (!selectedId && members.length) setSelectedId(members[0].membershipId);
  }, [members, selectedId]);
  useEffect(() => {
    setAllow(selected?.permissions?.allow ?? []);
    setDeny(selected?.permissions?.deny ?? []);
  }, [selectedId, selected?.permissions]);

  if (!members.length) return null;
  return (
    <Panel title="Tashkilot ichidagi ruxsatlar" icon={KeyRound} accent="gold">
      <div className="space-y-3">
        <select className={CONTROL.input} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {members.map((member) => <option key={member.membershipId} value={member.membershipId}>{member.name}</option>)}
        </select>
        <p className="text-[11px] text-ink-muted">Standart rol ruxsatlari avtomatik beriladi. Quyidagi “Ruxsat berish” va “Taqiqlash” tanlovlari shu a’zolik uchungina qo‘llanadi.</p>
        <div className="max-h-[440px] space-y-1 overflow-y-auto rounded-xl bg-surface/50 p-2">
          {PERMISSIONS.map(([key, label]) => (
            <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-tint/5 py-2 last:border-0">
              <span className="text-xs text-ink">{label}</span>
              <label className="flex items-center gap-1 text-[10px] text-teal"><input type="checkbox" checked={allow.includes(key)} onChange={(e) => { setAllow((old) => e.target.checked ? [...old.filter((x) => x !== key), key] : old.filter((x) => x !== key)); if (e.target.checked) setDeny((old) => old.filter((x) => x !== key)); }} /> Ruxsat</label>
              <label className="flex items-center gap-1 text-[10px] text-coral"><input type="checkbox" checked={deny.includes(key)} onChange={(e) => { setDeny((old) => e.target.checked ? [...old.filter((x) => x !== key), key] : old.filter((x) => x !== key)); if (e.target.checked) setAllow((old) => old.filter((x) => x !== key)); }} /> Taqiqlash</label>
            </div>
          ))}
        </div>
        <button className={CONTROL.buttonPrimary + ' w-full'} disabled={!selected || save.isPending} onClick={() => selected && save.mutate({ id: selected.membershipId, allow, deny })}><Save className="h-4 w-4" /> Ruxsatlarni saqlash</button>
      </div>
    </Panel>
  );
}
