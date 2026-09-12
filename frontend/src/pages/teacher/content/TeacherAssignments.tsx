import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';
import { useTeacherOverview } from '../../../hooks/useTeacher';

export  function TeacherAssignments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Forma state'lari
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO'>('TEXT');
  const [assignmentCategory, setAssignmentCategory] = useState<'LESSON' | 'HOMEWORK' | 'RESOURCE'>('LESSON');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Materiallarni olish
  const { data: items, isLoading } = useQuery({
    queryKey: ['teacher-assignments-list'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tests');
      return res.data;
    },
  });

  // Guruhlarni olish
  const { data: overviewData } = useTeacherOverview();
  const groups = overviewData?.groups || [];

  // Yangi material yaratish
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const payloadData = {
        type: newData.contentType,
        category: newData.assignmentCategory,
        mediaUrl: newData.mediaUrl,
        content: newData.description,
      };

      const res = await apiClient.post('/api/v1/tests', {
        title: newData.title,
        description: JSON.stringify(payloadData),
        durationSeconds: 1800,
        passingScore: 50,
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
      setAssignmentCategory('LESSON');
      setSelectedGroup('');
      setMediaUrl('');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Saqlashda xatolik yuz berdi!');
    },
  });

  // Xavfsiz filtrlash
  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter((item: any) => {
      if (!item) return false;

      let parsed;
      try {
        parsed = item.description ? JSON.parse(item.description) : {};
      } catch {
        parsed = { type: 'TEXT', category: 'LESSON', content: item.description };
      }

      const matchesSearch = (item.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
                            (parsed?.content?.toLowerCase() || '').includes(search.toLowerCase());
      
      const matchesType = filterType === 'ALL' || parsed?.type === filterType;
      const matchesCategory = filterCategory === 'ALL' || parsed?.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [items, search, filterType, filterCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title,
      description,
      contentType,
      assignmentCategory,
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
          <p className="text-xs text-ink-muted mt-1">Darslar, uy vazifalari va qo'shimcha topshiriqlarni boshqaring</p>
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
            <h2 className="font-display text-lg text-ink">Yangi material qo'shish</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink px-3 py-1.5 rounded-xl bg-white/5">
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
                <option value="RESOURCE">📎 Qo'shimcha topshiriq / Resurs</option>
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
              <label className="text-xs text-ink-muted font-medium">Qaysi guruhga</label>
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
              placeholder="Masalan: 3-mavzu yuzasidan uyga vazifa"
              required
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
            />
          </div>

          {contentType !== 'TEXT' && (
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                {contentType === 'VIDEO' ? 'YouTube Video URL' : contentType === 'IMAGE' ? 'Rasm URL' : 'PDF Fayl URL'}
              </label>
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
            <label className="text-xs text-ink-muted font-medium">Tafsilotlar / Ko'rsatmalar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O'quvchilar bajarishi kerak bo'lgan shartlar..."
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-gold text-base rounded-2xl py-3.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold/10"
          >
            {createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash va yuklash'}
          </button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
          className="flex-1 bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-surface/30 rounded-2xl px-4 py-3 text-xs outline-none border border-white/5 text-ink"
        >
          <option value="ALL">Barcha toifalar</option>
          <option value="LESSON">📖 Darslar</option>
          <option value="HOMEWORK">📝 Uy vazifalari</option>
          <option value="RESOURCE">📎 Qo'shimcha</option>
        </select>
      </div>

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
              parsed = item.description ? JSON.parse(item.description) : {};
            } catch {
              parsed = { type: 'TEXT', category: 'LESSON', content: item.description };
            }

            const catLabel = parsed.category === 'HOMEWORK' ? 'Uy vazifasi' : parsed.category === 'RESOURCE' ? 'Qo\'shimcha' : 'Dars';
            const catColor = parsed.category === 'HOMEWORK' ? 'bg-coral/10 text-coral' : parsed.category === 'RESOURCE' ? 'bg-sky-500/10 text-sky-400' : 'bg-gold/10 text-gold';

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/teacher/assignments/${item.id}`)}
                className="group bg-surface/20 hover:bg-surface/40 p-5 rounded-3xl border border-white/5 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${catColor}`}>
                      {catLabel}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-white/5 text-ink-muted uppercase">
                      {parsed.type || 'TEXT'}
                    </span>
                  </div>
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