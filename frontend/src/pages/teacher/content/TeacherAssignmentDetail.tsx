import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useTeacherAssignment, 
  useUpdateTeacherAssignment, 
  useDeleteTeacherAssignment, 
  useTeacherGroups 
} from '../../../hooks/useTeacherAssignments'; // Yo'lni o'zingizdagi fayl turgan joyga moslang

export default function TeacherAssignmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: assignment, isLoading } = useTeacherAssignment(id);
  const { data: groups } = useTeacherGroups();

  const updateMutation = useUpdateTeacherAssignment(id);
  const deleteMutation = useDeleteTeacherAssignment();

  // Tahrirlash rejimi va state'lar
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO'>('TEXT');
  const [assignmentCategory, setAssignmentCategory] = useState<'LESSON' | 'HOMEWORK' | 'RESOURCE'>('LESSON');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Ma'lumot kelganda state'larni to'ldirish
// Ma'lumot kelganda state'larni to'ldirish
  useEffect(() => {
    if (assignment) {
      const item = assignment as any; // Tip xatoligini oldini olish uchun
      setTitle(item.title || '');
      setDescription(item.description || '');
      setContentType((item.type as any) || 'TEXT');
      setAssignmentCategory((item.category as any) || 'LESSON');
      setSelectedGroup(item.groupId || item.group || '');
      setMediaUrl(item.mediaUrl || '');
    }
  }, [assignment]);

  if (isLoading || !assignment) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        title,
        description,
        type: contentType,
        category: assignmentCategory,
        groupId: selectedGroup,
        mediaUrl: mediaUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: (error: any) => {
          alert(error?.message || 'Yangilashda xatolik yuz berdi!');
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm('Haqiqatan ham bu materialni oʻchirmoqchimisiz?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          navigate('/teacher/assignments'); // Ro'yxat sahifasiga qaytish
        },
      });
    }
  };

  const catLabel = assignment.category === 'HOMEWORK' ? 'Uy vazifasi' : assignment.category === 'RESOURCE' ? 'Qo\'shimcha resurs' : 'Dars mavzusi';
  const catColor = assignment.category === 'HOMEWORK' ? 'bg-coral/10 text-coral' : assignment.category === 'RESOURCE' ? 'bg-sky-500/10 text-sky-400' : 'bg-gold/10 text-gold';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Orqaga qaytish va boshqaruv tugmalari */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/teacher/assignments')} 
          className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-4 py-2 rounded-2xl border border-white/5 transition-colors"
        >
          ← Orqaga qaytish
        </button>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs bg-gold/10 text-gold px-4 py-2 rounded-2xl font-semibold hover:bg-gold hover:text-base transition-all"
            >
              Tahrirlash
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs bg-red-500/10 text-red-400 px-4 py-2 rounded-2xl font-semibold hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'O\'chirilmoqda...' : 'O\'chirish'}
          </button>
        </div>
      </div>

      {isEditing ? (
        /* TAHRIRLASH FORMASI */
        <form onSubmit={handleUpdate} className="bg-surface/40 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="font-display text-lg text-ink">Materialni tahrirlash</h2>
            <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-ink-muted hover:text-ink px-3 py-1.5 rounded-xl bg-white/5">
              Bekor qilish
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Material toifasi</label>
              <select
                value={assignmentCategory}
                onChange={(e) => setAssignmentCategory(e.target.value as any)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="LESSON">📖 Dars mavzusi</option>
                <option value="HOMEWORK">📝 Uy vazifasi</option>
                <option value="RESOURCE">📎 Qo'shimcha resurs</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Kontent formati</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="TEXT">📄 Matn</option>
                <option value="IMAGE">🖼️ Rasm</option>
                <option value="PDF">📑 PDF fayl</option>
                <option value="VIDEO">📹 YouTube Video</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Guruh</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="">Guruhni tanlang...</option>
                {groups?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Sarlavha *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
            />
          </div>

          {contentType !== 'TEXT' && (
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Media URL</label>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Tafsilotlar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
            />
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full bg-gold text-base rounded-2xl py-3.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold/10"
          >
            {updateMutation.isPending ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
          </button>
        </form>
      ) : (
        /* KO'RISH (VIEW) REJIMI */
        <div className="bg-surface/20 p-8 rounded-3xl border border-white/5 space-y-6 backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${catColor}`}>
                {catLabel}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold bg-white/5 text-ink-muted uppercase`}>
                {assignment.type || 'TEXT'}
              </span>
            </div>
            
            <h1 className="font-display text-2xl sm:text-3xl text-ink">
              {assignment.title}
            </h1>
          </div>

          {/* Media yoki Havolalarni ko'rsatish */}
          {assignment.mediaUrl && (
            <div className="pt-2">
              {assignment.type === 'VIDEO' ? (
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface/50 border border-white/5">
                  <iframe
                    src={assignment.mediaUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title="YouTube video"
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : assignment.type === 'IMAGE' ? (
                <div className="rounded-2xl overflow-hidden border border-white/5 max-h-96 bg-surface/30 flex items-center justify-center">
                  <img src={assignment.mediaUrl} alt={assignment.title} className="max-h-96 object-contain" />
                </div>
              ) : (
                <a
                  href={assignment.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gold/10 text-gold text-sm font-semibold hover:bg-gold hover:text-base transition-all"
                >
                  🔗 Biriktirilgan faylni ochish →
                </a>
              )}
            </div>
          )}

          {/* Tavsif / Matn */}
          <div className="space-y-2 border-t border-white/5 pt-6">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Tafsilotlar va ko'rsatmalar</h3>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {assignment.description || 'Tavsif mavjud emas.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}