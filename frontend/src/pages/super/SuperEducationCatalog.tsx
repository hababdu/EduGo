import { useMemo, useState } from 'react';
import { BookOpen, Plus, Save, Tags, Trash2, X } from 'lucide-react';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { educationCatalogApi, EducationCatalogItem, useEducationDirections, useEducationTypes, useSuperMutation } from './superApi';

type Kind = 'type' | 'direction';
const empty = { slug: '', nameUz: '', nameRu: '', nameEn: '', description: '', category: '', sortOrder: 0, isActive: true };

function CatalogEditor({ kind, items }: { kind: Kind; items: EducationCatalogItem[] }) {
  const [draft, setDraft] = useState<typeof empty & { id?: string }>(empty);
  const [show, setShow] = useState(false);
  const save = useSuperMutation((v: typeof draft) => {
    return v.id
      ? (kind === 'type' ? educationCatalogApi.updateType(v as EducationCatalogItem) : educationCatalogApi.updateDirection(v as EducationCatalogItem))
      : (kind === 'type' ? educationCatalogApi.saveType(v) : educationCatalogApi.saveDirection(v));
  }, 'Katalog saqlandi');
  const remove = useSuperMutation((id: string) => kind === 'type' ? educationCatalogApi.deleteType(id) : educationCatalogApi.deleteDirection(id), 'Katalog elementi o‘chirildi');
  const title = kind === 'type' ? 'Tashkilot turlari' : 'Ta’lim yo‘nalishlari';
  const startEdit = (item: EducationCatalogItem) => {
    setDraft({ id: item.id, slug: item.slug, nameUz: item.nameUz, nameRu: item.nameRu ?? '', nameEn: item.nameEn ?? '', description: item.description ?? '', category: item.category ?? '', sortOrder: item.sortOrder, isActive: item.isActive });
    setShow(true);
  };
  const reset = () => { setDraft(empty); setShow(false); };
  const valid = draft.slug.trim().length >= 2 && draft.nameUz.trim().length >= 2;
  return (
    <Panel title={title} icon={kind === 'type' ? Tags : BookOpen} accent={kind === 'type' ? 'gold' : 'teal'}>
      <div className="space-y-3">
        <button type="button" className={`${CONTROL.buttonPrimary} w-full`} onClick={() => { setDraft(empty); setShow((v) => !v); }}>
          <Plus className="h-4 w-4" /> Yangi {kind === 'type' ? 'tashkilot turi' : 'yo‘nalish'}
        </button>
        {show && (
          <div className="space-y-2 rounded-2xl border border-tint/10 bg-surface/50 p-3">
            <div className="flex items-center justify-between"><b className="text-sm text-ink">{draft.id ? 'Tahrirlash' : 'Yangi element'}</b><button onClick={reset} className="rounded-lg p-1 text-ink-muted"><X className="h-4 w-4" /></button></div>
            <input className={CONTROL.input} placeholder="Slug (masalan: language-center)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            <input className={CONTROL.input} placeholder="Nomi (o‘zbekcha)" value={draft.nameUz} onChange={(e) => setDraft({ ...draft, nameUz: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={CONTROL.input} placeholder="Русское название" value={draft.nameRu} onChange={(e) => setDraft({ ...draft, nameRu: e.target.value })} />
              <input className={CONTROL.input} placeholder="English name" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
            </div>
            {kind === 'direction' && <input className={CONTROL.input} placeholder="Kategoriya (technology, academic...)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />}
            <textarea className={CONTROL.input} rows={2} placeholder="Izoh" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={CONTROL.input} type="number" placeholder="Tartib" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
              <label className="flex items-center gap-2 rounded-xl bg-surface px-3 text-xs text-ink"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Faol</label>
            </div>
            <div className="flex gap-2">
              <button disabled={!valid || save.isPending} className={`${CONTROL.buttonPrimary} flex-1 disabled:opacity-40`} onClick={() => save.mutate(draft, { onSuccess: reset })}><Save className="h-4 w-4" /> Saqlash</button>
              <button className={CONTROL.buttonSubtle} onClick={reset}>Bekor</button>
            </div>
          </div>
        )}
        <div className="divide-y divide-tint/5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{item.nameUz}</div>
                <div className="truncate text-[11px] text-ink-muted">{item.slug}{item.category ? ` · ${item.category}` : ''}</div>
                {!item.isActive && <span className="text-[10px] font-semibold text-coral">Nofaol</span>}
              </div>
              <button className="rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted" onClick={() => startEdit(item)}>Tahrirlash</button>
              <button className="rounded-lg bg-coral/10 p-2 text-coral" aria-label="O‘chirish" disabled={remove.isPending} onClick={() => { if (window.confirm(`«${item.nameUz}» o‘chirilsinmi?`)) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="py-5 text-center text-xs text-ink-muted">Katalog bo‘sh</p>}
        </div>
      </div>
    </Panel>
  );
}

export function SuperEducationCatalog() {
  const types = useEducationTypes();
  const directions = useEducationDirections();
  const typeItems = useMemo(() => types.data ?? [], [types.data]);
  const directionItems = useMemo(() => directions.data ?? [], [directions.data]);
  return (
    <div className={PAGE}>
      <StaffHero accent="teal" image={IMAGES.hero} eyebrow="SUPER ADMIN · PLATFORM SOZLAMALARI" title="Ta’lim katalogi" subtitle="Tashkilot turlari va yo‘nalishlarini boshqaring. Katalogga yangi tur qo‘shish uchun kodni o‘zgartirish shart emas." />
      {(types.isLoading || directions.isLoading) && <Skeleton className="h-36" />}
      {(types.error || directions.error) && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{(types.error || directions.error as Error)?.message}</p>}
      <div className="grid gap-4">
        <CatalogEditor kind="type" items={typeItems} />
        <CatalogEditor kind="direction" items={directionItems} />
      </div>
    </div>
  );
}
