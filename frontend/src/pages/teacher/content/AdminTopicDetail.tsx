import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  useTopic,
  useUpdateTopic,
  useLessons,
  useCreateLesson,
} from '../../../hooks/useContent';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';
import { LessonCard } from '../../../components/admin/content/LessonCard';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

export function AdminTopicDetail() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();

  const { haptic, hapticNotify, showBackButton, hideBackButton } = useTelegram();

  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(topicId);
  const updateTopic = useUpdateTopic(topicId, (topic?.sectionId as string) ?? '');
  const createLesson = useCreateLesson(topicId);

  /* ---------- Telegram BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate(-1);
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  const handlePublish = () => {
    haptic('light');
    updateTopic.mutate(
      { status: 'PUBLISHED' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Mavzu e'lon qilindi");
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  const handleUnpublish = () => {
    haptic('light');
    updateTopic.mutate(
      { status: 'DRAFT' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Mavzu qoralamaga qaytarildi');
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  const handleSequentialToggle = (checked: boolean) => {
    haptic('light');
    updateTopic.mutate(
      { sequentialLocked: checked },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast(
            'success',
            checked ? 'Ketma-ket rejim yoqildi' : "Ketma-ket rejim o'chirildi"
          );
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  const handleCreateLesson = (title: string) => {
    haptic('light');
    createLesson.mutate(
      { title },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Dars qo'shildi");
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  if (topicLoading || !topic) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-32 space-y-5">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md space-y-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate(-1);
            }}
            className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 shrink-0 min-h-[40px]"
          >
            ← Orqaga
          </button>
          <PublishToggle
            status={topic.status}
            isPending={updateTopic.isPending}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        </div>

        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {topic.title}
        </h1>

        {/* Sequential toggle */}
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl bg-surface/40 border border-white/5 active:scale-[0.99] transition-transform">
          <input
            type="checkbox"
            checked={!!topic.sequentialLocked}
            onChange={(e) => handleSequentialToggle(e.target.checked)}
            className="accent-gold w-5 h-5 shrink-0 mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="text-sm text-ink font-medium block">
              🔒 Ketma-ket ochilsin
            </span>
            <span className="text-[11px] text-ink-muted block">
              Oldingi mavzu tugatilmaguncha yopiq
            </span>
          </div>
        </label>
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-muted">Darslar</h2>

        <CreateItemForm
          placeholder="Yangi dars nomi (masalan: Video dars 1)"
          isPending={createLesson.isPending}
          onSubmit={handleCreateLesson}
        />

        {lessonsLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : lessons && lessons.length === 0 ? (
          <div className="text-center py-10 bg-surface/20 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Hali darslar yo'q.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons?.map((l) => (
              <LessonCard key={l.id} lesson={l} topicId={topicId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTopicDetail;