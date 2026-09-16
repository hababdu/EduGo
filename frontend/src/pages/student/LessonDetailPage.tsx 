// src/pages/student/LessonDetailPage.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

type ContentType = 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO';
type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';

interface AssignmentTest {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  order: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  description?: string | null;
  type: ContentType;
  category: AssignmentCategory;
  mediaUrl?: string | null;
  groupId: string;
  group?: { id: string; name: string } | null;
  teacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  } | null;
  tests?: AssignmentTest[];
}

const CATEGORY_META: Record<
  AssignmentCategory,
  { label: string; badge: string }
> = {
  LESSON: { label: 'Dars mavzusi', badge: 'bg-gold/10 text-gold' },
  HOMEWORK: { label: 'Uy vazifasi', badge: 'bg-coral/10 text-coral' },
  RESOURCE: { label: "Qo'shimcha", badge: 'bg-sky-500/10 text-sky-400' },
};

const CONTENT_META: Record<ContentType, { label: string; emoji: string }> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'Video', emoji: '📹' },
};

function useLessonDetail(id: string) {
  return useQuery({
    queryKey: ['student', 'lesson', id],
    queryFn: () => apiFetch<AssignmentItem>(`/api/v1/students/assignments/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function LessonDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { haptic, showBackButton, hideBackButton } = useTelegram();

  const { data: item, isLoading, error } = useLessonDetail(id);

  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate(-1);
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  if (isLoading || !item) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4 pb-24">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-3xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Material topilmadi
          </p>
          <p className="text-xs text-ink-muted">
            Material o'chirilgan yoki siz a'zo emassiz
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/lessons');
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl"
          >
            ← Darslarga qaytish
          </button>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.LESSON;
  const content = CONTENT_META[item.type] ?? CONTENT_META.TEXT;

  const teacherName = item.teacher
    ? `${item.teacher.firstName || ''} ${item.teacher.lastName || ''}`.trim() ||
      item.teacher.username ||
      "O'qituvchi"
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          haptic('light');
          navigate('/lessons');
        }}
        className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 w-fit min-h-[40px]"
      >
        ← Orqaga
      </button>

      {/* ============ HEADER ============ */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3 backdrop-blur-md">
        {/* Group + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.group && (
            <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-teal/10 text-teal">
              👥 {item.group.name}
            </span>
          )}
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${cat.badge}`}
          >
            {cat.label}
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
            {content.emoji} {content.label}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {item.title}
        </h1>

        {/* Teacher */}
        {teacherName && (
          <p className="text-xs text-ink-muted">👤 {teacherName}</p>
        )}
      </div>

      {/* ============ MEDIA ============ */}
      {item.mediaUrl && (
        <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3">
          {item.type === 'VIDEO' ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-surface/50 border border-white/5">
              <iframe
                src={item.mediaUrl
                  .replace('watch?v=', 'embed/')
                  .replace('youtu.be/', 'youtube.com/embed/')}
                title="Video"
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : item.type === 'IMAGE' ? (
            <div className="rounded-2xl overflow-hidden border border-white/5 max-h-96 bg-surface/30 flex items-center justify-center">
              <img
                src={item.mediaUrl}
                alt={item.title}
                className="max-h-96 object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            <a
              href={item.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gold/10 text-gold text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              🔗 {item.type === 'PDF' ? 'PDF faylni ochish' : 'Faylni ochish'} →
            </a>
          )}
        </div>
      )}

      {/* ============ DESCRIPTION ============ */}
      {item.description && (
        <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-2">
          <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Tafsilotlar
          </h3>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {item.description}
          </p>
        </div>
      )}

      {/* ============ TESTS ============ */}
      {item.tests && item.tests.length > 0 && (
        <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-gold">
            🧠 Test savollari ({item.tests.length})
          </h3>
          <div className="space-y-4">
            {item.tests.map((test, idx) => (
              <div
                key={test.id}
                className="bg-surface/30 p-4 rounded-2xl space-y-3 border border-white/5"
              >
                <p className="text-sm font-medium text-ink">
                  {idx + 1}. {test.question}
                </p>
                <div className="space-y-1.5">
                  {test.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className="text-xs px-3 py-2 rounded-xl bg-surface/50 text-ink-muted"
                    >
                      <span className="font-mono mr-1.5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LessonDetailPage;