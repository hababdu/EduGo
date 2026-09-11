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

  // Kengaytirilgan forma state'lari
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'LESSON' | 'HOMEWORK' | 'RESOURCE'>('LESSON');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Mavzular va materiallarni olish
  const { data: items, isLoading } = useQuery({
    queryKey: ['teacher-assignments-list'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tests');
      return res.data;
    },
  });

  // O'qituvchining o'z guruhlarini olish uchun so'rov (agar mavjud bo'lsa)
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

  // Yangi material / dars mavzusini yaratish
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await apiClient.post('/api/v1/tests', {
        title: newData.title,
        description: `[${newData.contentType}] ${newData.description}`,
        durationSeconds: 1800,
        passingScore: 50,
        questions: [],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setContentType('LESSON');
      setSelectedGroup('');
      setDueDate('');
      setAttachmentUrl('');
    },
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item: any) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                            item.description?.toLowerCase().includes(search.toLowerCase());
      if (filterType === 'ALL') return matchesSearch;
      return matchesSearch && item.description?.includes(`[${filterType}]`);
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
      dueDate,
      attachmentUrl,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Sarlavha va Yaratish tugmasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-gold/10 text-gold text-xs font-semibold">O'qituvchi Paneli</span>
          </div>
          <h1 className="font-display text-2xl text-ink mt-2">Dars Rejalari va Topshiriqlar</h1>
          <p className="text-xs text-ink-muted mt-1">
            Guruhlaringiz uchun dars mavzulari, uy vazifalari va o'quv materiallarini boshqaring
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-2xl px-5 py-3 font-semibold hover:opacity-90 transition-all shadow-lg shadow-gold/10 flex items-center justify-center gap-2"
        >
          <span>{showForm ? '✕ Yopish' : '+ Yangi material qo\'shish'}</span>
        </button>
      </div>

      {/* Yaratish Formasi */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface/40 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="font-display text-lg text-ink">Yangi dars yoki vazifa yaratish</h2>
              <p className="text-xs text-ink-muted">O'quvchilaringiz uchun kerakli ma'lumotlarni kiriting</p>
            </div>
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
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
              >
                <option value="LESSON">📖 Dars mavzusi</option>
                <option value="HOMEWORK">📝 Uy vazifasi</option>
                <option value="RESOURCE">📎 Foydali resurs / Fayl</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Qaysi guruhga</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
              >
                <option value="">Barcha guruhlarga</option>
                {groups?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Mavzu yoki topshiriq nomi *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: 3-mavzu: Funksiyalar hosilasi va uning tatbiqi"
              required
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Topshirish muddati (agar uy ishi bo'lsa)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">Fayl / Qo'shimcha havola (URL)</label>
              <input
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://t.me/... yoki Google Drive havola"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Dars mazmuni / Batafsil ko'rsatmalar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O'quvchilar bajarishi kerak bo'lgan qadamlar, qoidalar yoki nazariy matn..."
              rows={4}
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-gold text-base rounded-2xl py-3.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-gold/10"
          >
            {createMutation.isPending ? 'Saqlanmoqda...' : 'Materialni guruhga yuklash'}
          </button>
        </form>
      )}

      {/* Qidiruv va Filterlar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mavzu yoki vazifa nomi bo'yicha qidirish..."
          className="flex-1 bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
        />
        <div className="flex gap-1 bg-surface/30 p-1 rounded-2xl border border-white/5">
          {['ALL', 'LESSON', 'HOMEWORK', 'RESOURCE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 text-xs rounded-xl font-medium transition-colors ${
                filterType === type ? 'bg-gold text-base' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {type === 'ALL' ? 'Barchasi' : type === 'LESSON' ? 'Darslar' : type === 'HOMEWORK' ? 'Vazifalar' : 'Resurslar'}
            </button>
          ))}
        </div>
      </div>

      {/* Ro'yxat qismi */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface/30 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto text-lg font-bold">📂</div>
          <p className="text-sm text-ink-muted">Hali hech qanday dars mavzulari yoki topshiriqlar topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: any) => {
            const isHomework = item.description?.includes('[HOMEWORK]');
            const isResource = item.description?.includes('[RESOURCE]');
            const cleanDescription = item.description?.replace(/\[(LESSON|HOMEWORK|RESOURCE)\]/, '').trim();

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/teacher/assignments/${item.id}`)}
                className="group bg-surface/20 hover:bg-surface/40 p-5 rounded-3xl border border-white/5 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                      isHomework ? 'bg-coral/10 text-coral' : isResource ? 'bg-sky-500/10 text-sky-400' : 'bg-gold/10 text-gold'
                    }`}>
                      {isHomework ? 'Uy vazifasi' : isResource ? 'Resurs' : 'Dars mavzusi'}
                    </span>
                    <span className="text-xs text-ink-muted">· Yaratilgan sana</span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-gold transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-muted line-clamp-1">
                    {cleanDescription || 'Qo\'shimcha tavsif kiritilmagan'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-xl group-hover:bg-gold group-hover:text-base transition-all">
                    Boshqarish →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}