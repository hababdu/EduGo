// src/pages/admin/AdminTopicDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  useTopic,
  useUpdateTopic,
  useLessons,
  useCreateLesson,
} from '../../../hooks/useContent';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { ContentHero } from '../../../components/admin/content/ContentHero';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';
import { LessonCard } from '../../../components/admin/content/LessonCard';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import {
  Section,
  EmptyState,
  CheckboxRow,
  Skeleton,
} from '../../../components/ui';
import { BookOpen, Lock } from '../../../design/icons';
import { PAGE_NARROW } from '../../../design/tokens';

export function AdminTopicDetail() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showBackButton, hideBackButton } = useTelegram();

  const { data: topic, isLoading } = useTopic(topicId);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(topicId);
  const updateTopic = useUpdateTopic(topicId, (topic?.sectionId as string) ?? '');
  const createLesson = useCreateLesson(topicId);

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
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  const handleUnpublish = () => {
    haptic('light');
    updateTopic.mutate(
      { status: 'DRAFT' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Qoralamaga qaytarildi');
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  const handleSequential = (checked: boolean) => {
    haptic('light');
    updateTopic.mutate(
      { sequentialLocked: checked },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', checked ? 'Yoqildi' : "O'chirildi");
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik');
        },
      },
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
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  if (isLoading || !topic) {
    return (
      <div className={PAGE_NARROW}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className={PAGE_NARROW}>
      <ContentHero
        eyebrow="MAVZU"
        title={topic.title}
        onBack={() => {
          haptic('light');
          navigate(-1);
        }}
        actions={
          <PublishToggle
            status={topic.status}
            isPending={updateTopic.isPending}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        }
      />

      <CheckboxRow
        checked={!!topic.sequentialLocked}
        onChange={handleSequential}
        label="Ketma-ket ochilsin"
        description="Oldingi mavzu tugatilmaguncha yopiq"
        icon={<Lock className="w-4 h-4 text-gold" />}
      />

      <Section title="Darslar">
        <CreateItemForm
          placeholder="Yangi dars nomi..."
          isPending={createLesson.isPending}
          onSubmit={handleCreateLesson}
        />

        {lessonsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !lessons || lessons.length === 0 ? (
          <div className="bg-surface/20 border border-white/5 rounded-2xl">
            <EmptyState icon={BookOpen} title="Darslar yo'q" />
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((l) => (
              <LessonCard key={l.id} lesson={l} topicId={topicId} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default AdminTopicDetail;