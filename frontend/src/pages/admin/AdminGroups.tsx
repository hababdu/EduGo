import { useState, useMemo } from 'react';
import { useGroups, useCreateGroup, useDeleteGroup } from '../../hooks/useGroups';

export default function AdminGroups() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((g: any) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [groups, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Guruh nomini kiriting');
      return;
    }

    createGroup.mutate(
      { name, description },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setShowForm(false);
        },
        onError: (err: any) => {
          setFormError(err.message || 'Guruh yaratishda xatolik yuz berdi');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Guruhlar Boshqaruvi</h1>
          <p className="text-xs text-ink-muted mt-1">
            {groups ? `Jami: ${groups.length} ta guruh` : "Guruhlar ro'yxati"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-xl px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Yopish' : '+ Yangi guruh'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface/30 p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-sm font-medium text-ink">Yangi guruh yaratish</h2>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guruh nomi (masalan: Frontend 2026)"
              className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qisqacha tavsif (ixtiyoriy)..."
              rows={2}
              className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink resize-none"
            />
            {formError && <p className="text-xs text-coral">{formError}</p>}
            <button
              type="submit"
              disabled={createGroup.isPending}
              className="rounded-xl bg-gold text-base font-semibold px-5 py-2.5 text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createGroup.isPending ? 'Yaratilmoqda...' : 'Guruhni saqlash'}
            </button>
          </div>
        </form>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Guruh nomi bo'yicha qidirish..."
        className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-surface/20 rounded-2xl border border-white/5 space-y-2">
          <p className="text-sm text-ink-muted">Guruhlar topilmadi.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
          {filteredGroups.map((g: any) => (
            <div key={g.id} className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-ink">{g.name}</p>
                {g.description && <p className="text-xs text-ink-muted truncate">{g.description}</p>}
                <p className="text-[11px] text-ink-faint">
                  {g._count?.students ?? 0} ta talaba · {new Date(g.createdAt).toLocaleDateString('uz-UZ')} da yaratilgan
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`"${g.name}" guruhini o'chirasizmi?`)) {
                    deleteGroup.mutate(g.id);
                  }
                }}
                className="text-xs text-coral hover:bg-coral/10 px-3 py-1.5 rounded-xl transition-colors shrink-0"
              >
                O'chirish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}