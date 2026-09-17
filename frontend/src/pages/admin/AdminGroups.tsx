// src/pages/admin/AdminGroups.tsx
import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useTeachersList,
} from '../../hooks/useGroups';
import { useImageUpload, getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';

export default function AdminGroups() {
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm } = useTelegram();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groups, isLoading } = useGroups();
  const { data: teachers, isLoading: teachersLoading } = useTeachersList();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const { upload, isUploading, error: uploadError } = useImageUpload();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterPreview, setPosterPreview] = useState('');       // 👈 YANGI (preview)
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
    setPosterPreview('');
    setSelectedTeacherId('');
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---------- File select ---------- */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview darhol ko'rsatish
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPosterPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    haptic('light');

    // Backend'ga yuklash
    const result = await upload(file);

    if (result) {
      setPosterUrl(result.url);
      hapticNotify('success');
      toast('success', 'Rasm yuklandi');
    } else {
      hapticNotify('error');
      setPosterPreview('');
      setPosterUrl('');
    }
  };

  /* ---------- Remove poster ---------- */
  const handleRemovePoster = () => {
    haptic('light');
    setPosterUrl('');
    setPosterPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          toast('success', 'Guruh muvaffaqiyatli yaratildi!');
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
  const handleDelete = async (group: any) => {
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-4 bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-ink">
            Guruhlar Boshqaruvi
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {groups ? `Jami: ${groups.length} ta guruh` : 'Yuklanmoqda...'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-gold/10"
        >
          {showForm ? '✕ Yopish' : '+ Yangi guruh'}
        </button>
      </div>

      {/* ============ FORMA ============ */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface/40 p-5 rounded-3xl border border-white/10 space-y-4 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-semibold text-ink">
              Yangi guruh yaratish
            </h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setShowForm(false);
                resetForm();
              }}
              className="text-xs text-ink-muted hover:text-ink px-3 py-2 rounded-xl bg-white/5"
            >
              Bekor qilish
            </button>
          </div>

          <div className="space-y-3">
            {/* Nom */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Guruh nomi *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Frontend 2026"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </div>

            {/* Tavsif */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Tavsif (ixtiyoriy)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qisqacha tavsif..."
                rows={2}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </div>

            {/* 👇 POSTER RASM YUKLASH */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Poster rasm (ixtiyoriy)
              </label>

              {!posterPreview && !posterUrl ? (
                // Rasm tanlanmagan
                <button
                  type="button"
                  onClick={() => {
                    haptic('light');
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="w-full bg-surface rounded-2xl px-4 py-6 text-sm outline-none border border-dashed border-white/10 text-ink-muted hover:border-gold/50 hover:text-ink active:scale-[0.99] transition-all disabled:opacity-50 min-h-[120px] flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-xs font-medium">
                    {isUploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                  </span>
                  <span className="text-[10px]">
                    JPG, PNG, WEBP (maksimal 5 MB)
                  </span>
                </button>
              ) : (
                // Rasm tanlangan
                <div className="relative bg-surface/50 rounded-2xl overflow-hidden border border-white/5">
                  <img
                    src={posterPreview || getFullUrl(posterUrl)}
                    alt="Poster preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePoster}
                    className="absolute top-2 right-2 bg-red-500/90 text-white text-xs w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95]"
                  >
                    ✕
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <p className="text-white text-xs">Yuklanmoqda...</p>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploadError && (
                <p className="text-[10px] text-coral">{uploadError}</p>
              )}
            </div>

            {/* O'qituvchi (ixtiyoriy) */}
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                O'qituvchi (ixtiyoriy)
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
                  <option disabled>O'qituvchilar topilmadi</option>
                ) : (
                  teachers.map((t: any) => (
                    <option key={t.id || t._id} value={t.id || t._id}>
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
              disabled={createGroup.isPending || isUploading}
              className="w-full rounded-2xl bg-gold text-base font-semibold py-3.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {createGroup.isPending
                ? 'Yaratilmoqda...'
                : 'Guruhni saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* ============ SEARCH ============ */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Guruh nomi bo'yicha qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
      />

      {/* ============ LIST ============ */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-surface/30 rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm text-ink-muted">Guruhlar topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g: any) => {
            const teacherName = g.teacher
              ? `${g.teacher.firstName || ''} ${
                  g.teacher.lastName || ''
                }`.trim() || g.teacher.username
              : null;
            const membersCount =
              g._count?.members ?? g._count?.students ?? 0;
            const posterFullUrl = g.posterUrl
              ? getFullUrl(g.posterUrl)
              : null;

            return (
              <div
                key={g.id}
                onClick={() => {
                  haptic('light');
                  navigate(`/admin/groups/${g.id}`);
                }}
                className="bg-surface/20 hover:bg-surface/40 rounded-3xl border border-white/5 active:scale-[0.99] transition-all cursor-pointer overflow-hidden"
              >
                {/* POSTER */}
                {posterFullUrl ? (
                  <div className="w-full h-40 bg-surface/50 overflow-hidden">
                    <img
                      src={posterFullUrl}
                      alt={g.name}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-gold/10 to-teal/10 flex items-center justify-center text-5xl">
                    📁
                  </div>
                )}

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-ink truncate">
                        {g.name}
                      </h3>
                      {g.description && (
                        <p className="text-xs text-ink-muted line-clamp-2 mt-1">
                          {g.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(g);
                      }}
                      disabled={deleteGroup.isPending}
                      className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 shrink-0"
                    >
                      🗑
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-ink-muted flex-wrap">
                    <span>👥 {membersCount} talaba</span>
                    {teacherName && <span>👤 {teacherName}</span>}
                    {g.createdAt && (
                      <span>
                        📅 {new Date(g.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}