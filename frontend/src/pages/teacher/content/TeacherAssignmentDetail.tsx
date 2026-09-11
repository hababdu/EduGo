import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';
import { useTeacherOverview } from '../../../hooks/useTeacher'; // Hookni import qilish

export function TeacherAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO'>('TEXT');
  const [mediaUrl, setMediaUrl] = useState('');

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['teacher-assignment', assignmentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tests/${assignmentId}`);
      setTitle(res.data.title);
      
      try {
        const parsed = JSON.parse(res.data.description);
        setContentType(parsed.type || 'TEXT');
        setMediaUrl(parsed.mediaUrl || '');
        setDescription(parsed.content || '');
      } catch {
        setContentType('TEXT');
        setDescription(res.data.description || '');
      }
      return res.data;
    },
  });

  // Guruhlarni useTeacherOverview hukidan olish
  const { data: overviewData } = useTeacherOverview();
  const groups = overviewData?.groups || [];

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : '';
  };

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const payloadData = {
        type: updatedData.contentType,
        mediaUrl: updatedData.mediaUrl,
        content: updatedData.description,
      };
      const res = await apiClient.patch(`/api/v1/tests/${assignmentId}`, {
        title: updatedData.title,
        description: JSON.stringify(payloadData),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignment', assignmentId] });
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
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-3xl m-6" />;
  }

  const embedUrl = contentType === 'VIDEO' ? getEmbedUrl(mediaUrl) : '';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/teacher/assignments')} className="text-xs text-ink-muted hover:text-ink">
          ← Orqaga qaytish
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="text-xs bg-surface/50 text-ink px-3.5 py-2 rounded-xl border border-white/5">
            {isEditing ? 'Bekor qilish' : 'Tahrirlash'}
          </button>
          <button onClick={() => { if (confirm('Oʻchirmoqchimisiz?')) deleteMutation.mutate(); }} className="text-xs bg-coral/10 text-coral px-3.5 py-2 rounded-xl">
            O'chirish
          </button>
        </div>
      </div>

      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 backdrop-blur-md space-y-6">
        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ title, description, contentType, mediaUrl }); }} className="space-y-4">
            <h2 className="font-display text-lg text-ink">Materialni tahrirlash</h2>
            
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as any)}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
            >
              <option value="TEXT">📄 Matn</option>
              <option value="IMAGE">🖼️ Rasm</option>
              <option value="PDF">📑 PDF</option>
              <option value="VIDEO">📹 Video</option>
            </select>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
            />

            {contentType !== 'TEXT' && (
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Media URL"
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
              />
            )}

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none"
            />
            <button type="submit" className="bg-gold text-base text-xs font-semibold px-5 py-2.5 rounded-xl">Saqlash</button>
          </form>
        ) : (
          <div className="space-y-5">
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-gold/10 text-gold uppercase">
              {contentType}
            </span>
            <h1 className="font-display text-2xl text-ink">{assignment.title}</h1>

            {contentType === 'VIDEO' && embedUrl && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
                <iframe src={embedUrl} title="Video" className="w-full h-full" allowFullScreen />
              </div>
            )}

            {contentType === 'IMAGE' && mediaUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <img src={mediaUrl} alt="Content" className="w-full max-h-96 object-contain mx-auto" />
              </div>
            )}

            {contentType === 'PDF' && mediaUrl && (
              <div className="p-4 bg-surface/50 rounded-2xl border border-white/5 flex items-center justify-between">
                <span className="text-xs text-ink truncate">PDF Hujjat biriktirilgan</span>
                <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-gold underline shrink-0 ml-4">
                  Faylni ochish →
                </a>
              </div>
            )}

            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-surface/20 p-4 rounded-2xl border border-white/5">
              {description || 'Tavsif mavjud emas'}
            </p>
          </div>
        )}
      </div>

      {/* Guruhga biriktirish */}
      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 space-y-4">
        <h2 className="font-display text-lg text-ink">Guruhga biriktirish</h2>
        <form onSubmit={handleAssignToGroup} className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            required
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
          >
            <option value="">Guruhni tanlang...</option>
            {groups?.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button type="submit" disabled={isAssigning} className="bg-gold text-base rounded-2xl px-6 py-3 font-semibold text-xs shrink-0">
            {isAssigning ? 'Yuborilmoqda...' : 'Guruhga yuborish'}
          </button>
        </form>
      </div>
    </div>
  );
}