// src/pages/admin/AdminSubjectDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  useSubject,
  useUpdateSubject,
  useSections,
  useCreateSection,
} from '../../../hooks/useContent';
import { ContentHero } from '../../../components/admin/content/ContentHero';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import {
  Section,
  CardList,
  EmptyState,
  Skeleton,
} from '../../../components/ui';
import { Layers } from '../../../design/icons';
import { PAGE_NARROW, TEXT } from '../../../design/tokens';

export function AdminSubjectDetail() {
  const { subjectId = '' } = useParams();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showBackButton, hideBackButton } = useTelegram();

  const { data: subject, isLoading } = useSubject(subjectId);
  const { data: sections, isLoading: sectionsLoading } = useSections(subjectId);
  const updateSubject = useUpdateSubject(subjectId, (subject?.courseId as string) ?? '');
  const createSection = useCreateSection(subjectId);

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
    updateSubject.mutate(
      { status: 'PUBLISHED' },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Fan e'lon qilindi");
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
    updateSubject.mutate(
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

  const handleCreateSection = (title: string) => {
    haptic('light');
    createSection.mutate(
      { title },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Bo'lim qo'shildi");
        },
        onError: (e: any) => {
          hapticNotify('error');
          toast('error', e?.message || 'Xatolik');
        },
      },
    );
  };

  if (isLoading || !subject) {
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
        eyebrow="FAN"
        title={subject.title}
        onBack={() => {
          haptic('light');
          navigate(-1);
        }}
        actions={
          <PublishToggle
            status={subject.status}
            isPending={updateSubject.isPending}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        }
      />

      <Section title="Bo'limlar">
        <CreateItemForm
          placeholder="Yangi bo'lim nomi..."
          isPending={createSection.isPending}
          onSubmit={handleCreateSection}
        />

        {sectionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !sections || sections.length === 0 ? (
          <div className="bg-surface/20 border border-white/5 rounded-2xl">
            <EmptyState icon={Layers} title="Bo'limlar yo'q" />
          </div>
        ) : (
          <CardList>
            {sections.map((s) => (
              <ContentRow
                key={s.id}
                title={s.title}
                status={s.status}
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/content/sections/${s.id}`);
                }}
              />
            ))}
          </CardList>
        )}
      </Section>
    </div>
  );
}

export default AdminSubjectDetail;