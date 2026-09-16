// src/pages/student/LessonsPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

interface Course {
  id: string;
  title: string;
  description?: string | null;
  posterUrl?: string | null;
  _count?: {
    subjects?: number;
  };
}

function useCourses() {
  return useQuery({
    queryKey: ['courses', 'student'],
    queryFn: () => apiFetch<Course[]>('/api/v1/courses'),
    staleTime: 60_000,
  });
}

export function LessonsPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { data: courses, isLoading, error } = useCourses();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) => !q || c.title.toLowerCase().includes(q),
    );
  }, [courses, search]);

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
        <div className="h-20 bg-surface/30 rounded-3xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">Xatolik</p>
          <p className="text-xs text-ink-muted mt-2">
            {(error as any)?.message || "Server bilan bog'lanishda muammo"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          Darslar
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          {courses ? `Jami: ${courses.length} ta kurs` : 'Yuklanmoqda...'}
        </p>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Kurs nomi bo'yicha qidirish..."
        className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
      />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">
            {search ? 'Natija topilmadi' : "Hali kurslar yo'q"}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {search
              ? "Qidiruvni o'zgartirib ko'ring"
              : "Tez orada kurslar qo'shiladi"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                haptic('light');
                navigate(`/lessons/${c.id}`);
              }}
              className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center text-2xl shrink-0">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  {c._count?.subjects !== undefined && (
                    <p className="text-xs text-ink-muted mt-1">
                      📖 {c._count.subjects} ta fan
                    </p>
                  )}
                </div>
                <span className="text-ink-muted text-xs shrink-0">›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LessonsPage;