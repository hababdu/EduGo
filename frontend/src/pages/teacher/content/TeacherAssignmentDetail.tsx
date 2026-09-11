import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';

export function TeacherAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [contentType, setContentType] = useState<'LESSON' | 'HOMEWORK' | 'RESOURCE'>('LESSON');

  // Ma'lumotlarni olish va videoni ajratib olish
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['teacher-assignment', assignmentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tests/${assignmentId}`);
      setTitle(res.data.title);
      
      const rawDesc = res.data.description || '';
      
      // Tipe'ni aniqlab olish ([HOMEWORK], [RESOURCE] yoki [LESSON])
      if (rawDesc.includes('[HOMEWORK]')) setContentType('HOMEWORK');
      else if (rawDesc.includes('[RESOURCE]')) setContentType('RESOURCE');
      else setContentType('LESSON');

      // YouTube videoni ajratib olish
      const videoMatch = rawDesc.match(/\[VIDEO:(.*?)\]/);
      if (videoMatch) {
        setVideoUrl(videoMatch[1]);
      } else {
        setVideoUrl('');
      }

      // Tag'larni tozalab, sof description'ni olish
      const cleanDesc = rawDesc
        .replace(/\[(LESSON|HOMEWORK|RESOURCE)\]/, '')
        .replace(/\[VIDEO:.*?\]/, '')
        .trim();
      
      setDescription(cleanDesc);
      return res.data;
    },
  });

  // YouTube havolasini embed (iframe) formatiga o'tkazish funksiyasi
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : '';
  };

  const { data: groups } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/groups');
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: { title: string; description: string; contentType: string; videoUrl: string }) => {
      const fullDesc = `[${updatedData.contentType}]${updatedData.videoUrl ? ` [VIDEO:${updatedData.videoUrl}]` : ''} ${updatedData.description}`;
      const res = await apiClient.patch(`/api/v1/tests/${assignmentId}`, {
        title: updatedData.title,
        description: fullDesc,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignment', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/tests/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      navigate('/teacher/assignments');
    },
  });

  const handleAssignToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setIsAssigning(true);
    try {
      await apiClient.post(`/api/v1/tests/${assignmentId}/assign`, {
        targetType: 'GROUP',
        groupId: selectedGroup,
      });
      alert('Material guruhga muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading || !assignment) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="h-64 bg-surface/30 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Yuqori navigatsiya va tugmalar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/teacher/assignments')} className="text-xs text-ink-muted hover:text-ink transition-colors">
          ← Orqaga qaytish
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs bg-surface/50 hover:bg-surface text-ink px-3.5 py-2 rounded-xl border border-white/5 transition-all"
          >
            {isEditing ? 'Bekor qilish' : 'Tahrirlash'}
          </button>
          <button
            onClick={() => {
              if (confirm('Haqiqatan ham bu materialni oʻchirmoqchimisiz?')) deleteMutation.mutate();
            }}
            className="text-xs bg-coral/10 hover:bg-coral/20 text-coral px-3.5 py-2 rounded-xl transition-all"
          >
            O'chirish
          </button>
        </div>
      </div>

      {/* Asosiy ma'lumot yoki tahrirlash formasi */}
      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 backdrop-blur-md space-y-6">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ title, description, contentType, videoUrl });
            }}
            className="space-y-4"
          >
            <div className="border-b border-white/5 pb-3">
              <h2 className="font-display text-lg text-ink">Materialni tahrirlash</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Material turi</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="LESSON">📖 Dars mavzusi va Video</option>
                <option value="HOMEWORK">📝 Uy vazifasi</option>
                <option value="RESOURCE">📎 Foydali resurs</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Mavzu nomi</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">YouTube video havolasi (URL)</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Tavsif / Izoh</label>
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
              className="w-full bg-gold text-base rounded-2xl py-3 font-semibold text-xs hover:opacity-90 transition-opacity"
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold inline-block ${
                contentType === 'HOMEWORK' ? 'bg-coral/10 text-coral' : contentType === 'RESOURCE' ? 'bg-sky-500/10 text-sky-400' : 'bg-gold/10 text-gold'
              }`}>
                {contentType === 'HOMEWORK' ? 'Uy vazifasi' : contentType === 'RESOURCE' ? 'Foydali resurs' : 'Dars mavzusi'}
              </span>
              <h1 className="font-display text-2xl text-ink">{assignment.title}</h1>
            </div>
            
            {/* YouTube Videoni to'g'ridan-to'g'ri ijro etish oynasi (iframe) */}
            {embedUrl ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg">
                <iframe
                  src={embedUrl}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : videoUrl ? (
              <div className="p-4 bg-surface/50 rounded-2xl border border-white/5 text-xs text-ink-muted">
                YouTube havola kiritilgan, lekin uni ochib bo'lmadi: <a href={videoUrl} target="_blank" rel="noreferrer" className="text-gold underline">{videoUrl}</a>
              </div>
            ) : null}

            <div className="pt-2">
              <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Dars tavsifi va ko'rsatmalar</h3>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-surface/20 p-4 rounded-2xl border border-white/5">
                {description || 'Tavsif mavjud emas'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Guruhga biriktirish qismi */}
      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 backdrop-blur-md space-y-4">
        <div>
          <h2 className="font-display text-lg text-ink">Guruhga biriktirish</h2>
          <p className="text-xs text-ink-muted">Bu materialni ma'lum bir o'quv guruhiga yuborish</p>
        </div>
        <form onSubmit={handleAssignToGroup} className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            required
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
          >
            <option value="">Guruhni tanlang...</option>
            {groups?.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAssigning}
            className="bg-gold text-base rounded-2xl px-6 py-3 font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {isAssigning ? 'Yuborilmoqda...' : 'Guruhga biriktirish'}
          </button>
        </form>
      </div>
    </div>
  );
}