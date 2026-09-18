// src/pages/admin/AdminGroups.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useTeachersList,
} from '../../hooks/useGroups';
import { getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';
import { PexelsPhotoPickerModal } from '../../components/admin/PexelsPhotoPickerModal';

export default function AdminGroups() {
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm } = useTelegram();

  const { data: groups, isLoading } = useGroups();
  const { data: teachers, isLoading: teachersLoading } = useTeachersList();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();

  const [showForm, setShowForm] = useState(false);
  const [showPexelsModal, setShowPexelsModal] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  /* ---------- Filter ---------- */
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const q = search.trim().toLowerCase();
    return groups.filter(
      (g: any) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)),
    );
  }, [groups, search]);

  /* ---------- Reset ---------- */
  const resetForm = () => {
    setName('');
    setDescription('');
    setPosterUrl('');
    setSelectedTeacherId('');
    setFormError(null);
  };

  /* ---------- Pexels select ---------- */
  const handlePexelsSelect = (url: string) => {
    setPosterUrl(url);
    hapticNotify('success');
    toast('success', 'Rasm tanlandi');
  };

  const handleRemovePoster = () => {
    haptic('light');
    setPosterUrl('');
  };

  /* ---------- Create ---------- */
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      hapticNotify('error');
      setFormError('Guruh nomini kiriting');
      return;
    }

    haptic('light');

    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: posterUrl || undefined,
        teacherId: selectedTeacherId || undefined,
      },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Guruh yaratildi!');
          resetForm();
          setShowForm(false);
        },
        onError: (err: any) => {
          hapticNotify('error');
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Guruh yaratishda xatolik';
          setFormError(Array.isArray(msg) ? msg[0] : msg);
          toast('error', Array.isArray(msg) ? msg[0] : msg);
        },
      },
    );
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    haptic('medium');

    const confirmed = await showConfirm(
      `"${group.name}" guruhini o'chirasizmi?`,
    );
    if (!confirmed) return;

    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Guruh o'chirildi");
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast(
          'error',
          err?.response?.data?.message ||
            err?.message ||
            "O'chirishda xatolik",
        );
      },
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* ==================== HEADER ==================== */}
      <div className="bg-surface/20 p-4 rounded-3xl border border-white/5 backdrop-blur-md space-y-3">
        <div>
          <h1 className="font-display text-xl text-ink">Guruhlar</h1>
          <p className="text-xs text-ink-muted mt-1">
            {groups ? `Jami: ${groups.length} ta` : 'Yuklanmoqda...'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3 font-semibold active:scale-[0.98] transition-transform"
        >
          {showForm ? '✕ Yopish' : '+ Yangi guruh'}
        </button>
      </div>

      {/* ==================== FORMA ==================== */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface/40 p-4 rounded-3xl border border-white/10 space-y-4 backdrop-blur-xl"
        >
          <h2 className="text-sm font-semibold text-ink border-b border-white/5 pb-3">
            Yangi guruh
          </h2>

          <div className="space-y-3">
            {/* Nom */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Guruh nomi *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Frontend 2026"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </div>

            {/* Tavsif */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Tavsif
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qisqacha..."
                rows={2}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </div>

            {/* Poster */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Poster (ixtiyoriy)
              </label>

              {!posterUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    setShowPexelsModal(true);
                  }}
                  className="w-full bg-surface rounded-2xl px-4 py-6 outline-none border border-dashed border-white/10 text-ink-muted hover:border-gold/50 active:scale-[0.99] transition-all min-h-[120px] flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-3xl">🔍</span>
                  <span className="text-xs font-medium">
                    Rasm qidirish
                  </span>
                  <span className="text-[10px]">
                    Pexels'dan bepul rasmlar
                  </span>
                </button>
              ) : (
                <div className="relative bg-surface/50 rounded-2xl overflow-hidden border border-white/5">
                  <img
                    src={getFullUrl(posterUrl)}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePoster}
                    className="absolute top-2 right-2 bg-red-500/90 text-white text-xs w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Teacher */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Ustoz (ixtiyoriy)
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={teachersLoading}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px] disabled:opacity-50"
              >
                <option value="">Keyinroq biriktirish</option>
                {teachersLoading ? (
                  <option>Yuklanmoqda...</option>
                ) : !teachers || teachers.length === 0 ? (
                  <option disabled>Ustozlar topilmadi</option>
                ) : (
                  teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                      {t.username ? ` (@${t.username})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {formError && <p className="text-xs text-coral">{formError}</p>}

            <button
              type="submit"
              disabled={createGroup.isPending}
              className="w-full rounded-2xl bg-gold text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {createGroup.isPending ? 'Yaratilmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* ==================== SEARCH ==================== */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Guruh qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
      />

      {/* ==================== LIST — 2 USTUN ==================== */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-surface/30 rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm text-ink-muted">Guruhlar topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredGroups.map((g: any) => {
            const posterFullUrl = g.posterUrl
              ? getFullUrl(g.posterUrl)
              : null;
            const membersCount =
              g._count?.members ?? g._count?.students ?? 0;
            const teacherName = g.teacher
              ? `${g.teacher.firstName || ''} ${
                  g.teacher.lastName || ''
                }`.trim() || g.teacher.username
              : null;

            return (
              <div
                key={g.id}
                onClick={() => {
                  haptic('light');
                  navigate(`/admin/groups/${g.id}`);
                }}
                className="bg-surface/20 hover:bg-surface/40 rounded-3xl border border-white/5 active:scale-[0.98] transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                {/* POSTER */}
                <div className="relative w-full aspect-square bg-surface/50 overflow-hidden">
                  {posterFullUrl ? (
                    <img
                      src={posterFullUrl}
                      alt={g.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gold/10 to-teal/10 flex items-center justify-center text-5xl">
                      📁
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, g)}
                    disabled={deleteGroup.isPending}
                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform disabled:opacity-50"
                  >
                    🗑
                  </button>

                  {/* Members */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-medium">
                    👥 {membersCount}
                  </div>
                </div>

                {/* INFO */}
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {g.name}
                  </h3>
                  {g.description && (
                    <p className="text-[11px] text-ink-muted line-clamp-2 leading-snug">
                      {g.description}
                    </p>
                  )}
                  {teacherName && (
                    <p className="text-[10px] text-ink-muted truncate mt-auto pt-1">
                      👤 {teacherName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== PEXELS MODAL ==================== */}
      <PexelsPhotoPickerModal
        isOpen={showPexelsModal}
        onClose={() => setShowPexelsModal(false)}
        onSelect={handlePexelsSelect}
      />
    </div>
  );
}