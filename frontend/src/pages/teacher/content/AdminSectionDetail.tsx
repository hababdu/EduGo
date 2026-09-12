import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  useSection,
  useUpdateSection,
  useTopics,
  useCreateTopic,
} from '../../../hooks/useContent';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

export function AdminSectionDetail() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();

  const { haptic, hapticNotify, showBackButton, hideBackButton } = useTelegram();

  const { data: section, isLoading: sectionLoading } = useSection(sectionId);
  const { data: topics, isLoading: topicsLoading } = useTopics(sectionId);
  const updateSection = useUpdateSection(
    sectionId,
    (section?.subjectId as string) ?? ''
  );
  const createTopic = useCreateTopic(sectionId);

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

  /* ---------- Publish toggle ---------- */
  const handlePublish = () => {
    haptic('light');
    updateSection.mutate(
      { status: 'PUBLISHED' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Bo'lim e'lon qilindi");
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
    updateSection.mutate(
      { status: 'DRAFT' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Bo\'lim qoralamaga qaytarildi');
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  /* ---------- Create topic ---------- */
  const handleCreateTopic = (title: string) => {
    haptic('light');
    createTopic.mutate(
      { title },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Mavzu qo\'shildi');
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik!');
        },
      }
    );
  };

  /* ---------- Loading ---------- */
  if (sectionLoading || !section) {
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
            status={section.status}
            isPending={updateSection.isPending}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        </div>

        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {section.title}
        </h1>
      </div>

      {/* Topics */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-muted">Mavzular</h2>

        <CreateItemForm
          placeholder="Yangi mavzu nomi (masalan: Chiziqli tenglamalar)"
          isPending={createTopic.isPending}
          onSubmit={handleCreateTopic}
        />

        {topicsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : topics && topics.length === 0 ? (
          <div className="text-center py-10 bg-surface/20 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Hali mavzular yo'q.</p>
          </div>
        ) : (
          <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {topics?.map((t) => (
              <ContentRow
                key={t.id}
                title={t.title}
                status={t.status}
                subtitle={
                  t.sequentialLocked ? '🔒 Ketma-ket ochiladi' : undefined
                }
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/content/topics/${t.id}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSectionDetail;