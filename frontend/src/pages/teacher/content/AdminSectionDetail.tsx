// src/pages/admin/AdminSectionDetail.tsx
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
import {
  PageHeader,
  Section,
  CardList,
  EmptyState,
  Skeleton,
} from '../../../components/ui';
import { BookOpen } from '../../../design/icons';
import { PAGE_NARROW } from '../../../design/tokens';

export function AdminSectionDetail() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showBackButton, hideBackButton } = useTelegram();

  const { data: section, isLoading } = useSection(sectionId);
  const { data: topics, isLoading: topicsLoading } = useTopics(sectionId);
  const updateSection = useUpdateSection(
    sectionId,
    (section?.subjectId as string) ?? '',
  );
  const createTopic = useCreateTopic(sectionId);

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
    updateSection.mutate(
      { status: 'PUBLISHED' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Bo'lim e'lon qilindi");
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
    updateSection.mutate(
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

  const handleCreateTopic = (title: string) => {
    haptic('light');
    createTopic.mutate(
      { title },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Mavzu qo'shildi");
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  if (isLoading || !section) {
    return (
      <div className={PAGE_NARROW}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className={PAGE_NARROW}>
      <PageHeader
        title={section.title}
        onBack={() => {
          haptic('light');
          navigate(-1);
        }}
        actions={
          <PublishToggle
            status={section.status}
            isPending={updateSection.isPending}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        }
      />

      <Section title="Mavzular">
        <CreateItemForm
          placeholder="Yangi mavzu nomi..."
          isPending={createTopic.isPending}
          onSubmit={handleCreateTopic}
        />

        {topicsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !topics || topics.length === 0 ? (
          <div className="bg-surface/20 border border-white/5 rounded-2xl">
            <EmptyState icon={BookOpen} title="Mavzular yo'q" />
          </div>
        ) : (
          <CardList>
            {topics.map((t) => (
              <ContentRow
                key={t.id}
                title={t.title}
                status={t.status}
                subtitle={t.sequentialLocked ? 'Ketma-ket ochiladi' : undefined}
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/content/topics/${t.id}`);
                }}
              />
            ))}
          </CardList>
        )}
      </Section>
    </div>
  );
}

export default AdminSectionDetail;