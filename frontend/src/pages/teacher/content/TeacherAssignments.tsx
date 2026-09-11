import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';

export function TeacherAssignments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Forma state'lari
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO'>('TEXT');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [mediaUrl, setMediaUrl] = useState(''); // Video, rasm yoki PDF havolasi uchun

  // Materiallarni olish (backenddagi mavjud test/material endpointi)
  const { data: items, isLoading } = useQuery({
    queryKey: ['teacher-assignments-list'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tests');
      return res.data;
    },
  });

  // Ustozga biriktirilgan guruhlarni olish (backenddan to'g'ridan-to'g'ri o'qituvchi guruhlari)
  const { data: groups } = useQuery({
    queryKey: ['teacher-assigned-groups'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/teacher/groups');
        return res.data;
      } catch {
        // Agar maxsus endpoint bo'lmasa, umumiy guruhlar endpointidan foydalanish
        const res = await apiClient.get('/api/v1/groups');
        return res.data;
      }
    },
  });

  // Yangi material yaratish (Backend talablariga moslashtirilgan holda)
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      // Barcha ma'lumotlarni description ichida JSON yoki maxsus formatda saqlaymiz
      const payloadData = {
        type: newData.contentType,
        mediaUrl: newData.mediaUrl,
        content: newData.description,
      };

      const res = await apiClient.post('/api/v1/tests', {
        title: newData.title,
        description: JSON.stringify(payloadData),
        durationSeconds: 1800,
        passingScore: 50,
        questions: [],
        groupId: newData.selectedGroup || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setContentType('TEXT');
      setSelectedGroup('');
      setMediaUrl('');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Saqlashda xatolik yuz berdi!');
    },
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item: any) => {
      let parsed;
      try {
        parsed = JSON.parse(item.description);
      } catch {
        parsed = { type: 'TEXT', content: item.description };
      }

      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                            parsed?.content?.toLowerCase().includes(search.toLowerCase());
      
      if (filterType === 'ALL') return matchesSearch;
      return matchesSearch && parsed?.type === filterType;
    });
  }, [items, search, filterType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title,
      description,
      contentType,
      selectedGroup,
      mediaUrl,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <span className="px-2.5 py-1 rounded-lg bg-gold/10 text-gold text-xs font-semibold">O'qituvchi Paneli</span>
          <h1 className="font-display text-2xl text-ink mt-2">Dars Materiallari va Topshiriqlar</h1>
          <p className="text-xs text-ink-muted mt-1">Guruhlaringiz uchun matn, rasm, PDF va video darslarni boshqaring</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-2xl px-5 py-3 font-semibold hover:opacity-95 transition-all shadow-lg shadow-gold/10"
        >
          {showForm ? '✕ Yopish' : '+ Yangi material yuklash'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface/40 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="font-display text-lg text-ink">Yangi o'quv materialini qo'shish</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink px-3 py-1.5 rounded-xl bg-white/5">
              Bekor qilish
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Material turi</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="TEXT">📄 Matnli dars / Ma'lumot</option>
                <option value="IMAGE">🖼️ Rasm (Image URL)</option>
                <option value="PDF">📑 PDF hujjat / Fayl URL</option>
                <option value="VIDEO">📹 YouTube Video</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Qaysi guruhga biriktiriladi</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              >
                <option value="">Guruhni tanlang...</option>
                {groups?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.course?.title || 'Kurs'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Material sarlavhasi *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: 1-mavzu bo'yicha qo'llanma"
              required
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
            />
          </div>

          {contentType !== 'TEXT' && (
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                {contentType === 'VIDEO' ? 'YouTube Video Havolasi (URL)' : contentType === 'IMAGE' ? 'Rasm havolasi (URL)' : 'PDF Fayl havolasi (URL)'}
              </label>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={contentType === 'VIDEO' ? 'https://youtu.be/...' : 'https://...'}
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Tafsilotlar yoki qo'shimcha matn</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O'quvchilar uchun ko'rsatmalar..."
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-gold text-base rounded-2xl py-3.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold/10"
          >
            {createMutation.isPending ? 'Saqlanmoqda...' : 'Materialni saqlash va yuklash'}
          </button>
        </form>
      )}

      {/* Filterlar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
          className="flex-1 bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
        />
        <div className="flex gap-1 bg-surface/30 p-1 rounded-2xl border border-white/5 overflow-x-auto">
          {['ALL', 'TEXT', 'IMAGE', 'PDF', 'VIDEO'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 text-xs rounded-xl font-medium transition-colors shrink-0 ${
                filterType === type ? 'bg-gold text-base' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {type === 'ALL' ? 'Barchasi' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Ro'yxat */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface/30 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm text-ink-muted">Hech qanday material topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: any) => {
            let parsed: any = {};
            try {
              parsed = JSON.parse(item.description);
            } catch {
              parsed = { type: 'TEXT', content: item.description };
            }

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/teacher/assignments/${item.id}`)}
                className="group bg-surface/20 hover:bg-surface/40 p-5 rounded-3xl border border-white/5 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-gold/10 text-gold uppercase">
                    {parsed.type || 'TEXT'}
                  </span>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-gold transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-muted line-clamp-1">
                    {parsed.content || 'Tavsif yoʻq'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-xl group-hover:bg-gold group-hover:text-base transition-all shrink-0">
                  Ochish →
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}