// src/pages/admin/AdminGroups.tsx
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
import { ScheduleFields, ScheduleValue, scheduleBody, validateSchedule } from '../../components/group/ScheduleFields';
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
import { StaffHero, Panel, Avatar, ProgressBar } from '../../components/staff';
import { EmptyState, Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE, CONTROL } from '../../design/tokens';
import { Plus, X, Search, Trash2, Users, FolderOpen, Image, RefreshCw, GraduationCap } from '../../design/icons';

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
  const [sched, setSched] = useState<ScheduleValue>({ days: [], start: '', end: '', room: '' });
  const [capacity, setCapacity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  /* ============ FILTER ============ */
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

  /* ============ RESET FORM ============ */
  const resetForm = () => {
    setName('');
    setDescription('');
    setPosterUrl('');
    setSelectedTeacherId('');
    setSched({ days: [], start: '', end: '', room: '' });
    setCapacity('');
    setFormError(null);
  };

  /* ============ PEXELS SELECT ============ */
  const handlePexelsSelect = (url: string) => {
    setPosterUrl(url);
    hapticNotify('success');
    toast('success', 'Rasm tanlandi');
  };

  const handleRemovePoster = () => {
    haptic('light');
    setPosterUrl('');
  };

  /* ============ CREATE ============ */
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      hapticNotify('error');
      setFormError('Guruh nomini kiriting');
      return;
    }

    const schedErr = validateSchedule(sched);
    if (schedErr) {
      hapticNotify('error');
      setFormError(schedErr);
      return;
    }
    const capNum = capacity.trim() === '' ? undefined : Number(capacity);
    if (capNum !== undefined && (!Number.isInteger(capNum) || capNum < 1 || capNum > 500)) {
      hapticNotify('error');
      setFormError("Sig'im 1 dan 500 gacha butun son bo'lsin");
      return;
    }

    haptic('light');

    createGroup.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: posterUrl || undefined,
        teacherId: selectedTeacherId || undefined,
        ...(capNum !== undefined ? { maxCapacity: capNum } : {}),
        ...(sched.days.length > 0 || sched.start || sched.room.trim() ? scheduleBody(sched) : {}),
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

  /* ============ DELETE ============ */
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

  const totalMembers = (groups ?? []).reduce(
    (sum: number, g: any) => sum + (g._count?.members ?? g._count?.students ?? 0),
    0,
  );

  return (
    <div className={PAGE_WIDE}>
      {/* ==================== HERO ==================== */}
      <StaffHero
        accent="sky"
        image={IMAGES.hero}
        eyebrow="EduGo · Administrator"
        title="Guruhlar"
        subtitle="Guruhlarni yaratish, ustoz biriktirish va a'zolarni boshqarish."
        actions={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setShowForm((v) => !v);
              if (!showForm) resetForm();
            }}
            className={showForm ? CONTROL.buttonGhost : CONTROL.buttonPrimary}
          >
            {showForm ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {showForm ? 'Yopish' : 'Yangi guruh'}
          </button>
        }
        footer={
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
            <div>
              <p className="text-[11px] text-ink-muted">Jami guruhlar</p>
              <p className="font-display text-4xl font-extrabold text-gold tabular-nums leading-none mt-1">
                {groups ? groups.length : '–'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-muted">Jami a'zolar</p>
              <p className="font-display text-4xl font-extrabold text-teal tabular-nums leading-none mt-1">
                {groups ? totalMembers : '–'}
              </p>
            </div>
          </div>
        }
      />

      {/* ==================== FORMA ==================== */}
      {showForm && (
        <form onSubmit={handleCreate}>
          <Panel title="Yangi guruh" icon={Plus} accent="sky">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-ink-muted font-medium">Guruh nomi *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Frontend 2026"
                    className={CONTROL.input}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink-muted font-medium">Tavsif</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Qisqacha..."
                    rows={2}
                    className={CONTROL.textarea}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink-muted font-medium">Ustoz (ixtiyoriy)</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    disabled={teachersLoading}
                    className={`${CONTROL.select} disabled:opacity-50`}
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
              </div>

              {/* Dars jadvali va sig'im */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-surface/30 p-4">
                <ScheduleFields value={sched} onChange={setSched} />
                <label className="block text-xs text-ink-muted space-y-1">
                  Sig'im (ixtiyoriy)
                  <input
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Cheklanmagan"
                    className={CONTROL.input}
                  />
                </label>
              </div>

              {/* Poster — Pexels orqali */}
              <div className="space-y-1.5">
                <label className="text-xs text-ink-muted font-medium">Poster (ixtiyoriy)</label>

                {!posterUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light');
                      setShowPexelsModal(true);
                    }}
                    className="w-full bg-surface/40 rounded-2xl px-4 py-6 outline-none border border-dashed border-white/10 text-ink-muted hover:border-sky/50 active:scale-[0.99] transition-all min-h-[160px] flex flex-col items-center justify-center gap-2"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/10 text-sky">
                      <Search className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-ink">Rasm qidirish</span>
                    <span className="text-[10px]">Pexels'dan bepul rasmlar</span>
                  </button>
                ) : (
                  <div className="relative bg-surface/50 rounded-2xl overflow-hidden border border-white/10">
                    <img src={getFullUrl(posterUrl)} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={handleRemovePoster}
                      aria-label="Rasmni olib tashlash"
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptic('light');
                        setShowPexelsModal(true);
                      }}
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[11px] px-3 py-1.5 rounded-xl font-semibold active:scale-[0.95]"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      Almashtirish
                    </button>
                  </div>
                )}
              </div>
            </div>

            {formError && <p className="mt-3 text-xs text-coral">{formError}</p>}

            <button
              type="submit"
              disabled={createGroup.isPending}
              className={`${CONTROL.buttonPrimary} mt-4 w-full lg:w-auto lg:px-10 disabled:opacity-50`}
            >
              {createGroup.isPending ? 'Yaratilmoqda...' : 'Saqlash'}
            </button>
          </Panel>
        </form>
      )}

      {/* ==================== SEARCH ==================== */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Guruh qidirish..."
          className={`${CONTROL.input} pl-10`}
        />
      </div>

      {/* ==================== LIST ==================== */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-surface/40">
          <EmptyState icon={FolderOpen} title="Guruhlar topilmadi" subtitle="Qidiruvni o'zgartiring yoki yangi guruh yarating." />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredGroups.map((g: any) => {
            const posterFullUrl = g.posterUrl ? getFullUrl(g.posterUrl) : null;
            const membersCount = g._count?.members ?? g._count?.students ?? 0;
            const teacherName = g.teacher
              ? `${g.teacher.firstName || ''} ${g.teacher.lastName || ''}`.trim() || g.teacher.username
              : null;
            const fill = g.maxCapacity ? Math.round((membersCount / g.maxCapacity) * 100) : null;

            return (
              <div
                key={g.id}
                onClick={() => {
                  haptic('light');
                  navigate(`/admin/groups/${g.id}`);
                }}
                className="group bg-surface/50 hover:bg-surface/70 hover:border-white/20 rounded-3xl border border-white/10 active:scale-[0.98] transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                <div className="relative w-full aspect-[4/3] bg-surface/50 overflow-hidden">
                  {posterFullUrl ? (
                    <img
                      src={posterFullUrl}
                      alt={g.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky/15 to-teal/10 flex items-center justify-center text-sky/70">
                      <FolderOpen className="h-10 w-10" aria-hidden="true" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, g)}
                    disabled={deleteGroup.isPending}
                    aria-label="Guruhni o'chirish"
                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform hover:text-coral disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-medium">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {membersCount}
                    {g.maxCapacity ? ` / ${g.maxCapacity}` : ''}
                  </div>
                </div>

                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-ink truncate">{g.name}</h3>
                  {g.description && (
                    <p className="text-[11px] text-ink-muted line-clamp-2 leading-snug">{g.description}</p>
                  )}
                  <ScheduleBadge schedule={g} className="mt-0.5" />
                  {fill !== null && <ProgressBar value={fill} tone="auto" className="mt-1" />}
                  {teacherName && (
                    <div className="mt-auto flex items-center gap-2 pt-1.5 min-w-0">
                      <Avatar name={teacherName} size="sm" />
                      <span className="text-[11px] text-ink-muted truncate">{teacherName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PexelsPhotoPickerModal
        isOpen={showPexelsModal}
        onClose={() => setShowPexelsModal(false)}
        onSelect={handlePexelsSelect}
      />
    </div>
  );
}
