import { useParams, useNavigate } from 'react-router-dom';
import { useSubject, useUpdateSubject, useSections, useCreateSection } from '../../../hooks/useContent';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';

export function AdminSubjectDetail() {
  const { subjectId = '' } = useParams();
  const navigate = useNavigate();
  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId);
  const { data: sections, isLoading: sectionsLoading } = useSections(subjectId);
  const updateSubject = useUpdateSubject(subjectId, (subject?.courseId as string) ?? '');
  const createSection = useCreateSection(subjectId);

  if (subjectLoading || !subject) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">{subject.title}</h1>
        <PublishToggle
          status={subject.status}
          isPending={updateSubject.isPending}
          onPublish={() => updateSubject.mutate({ status: 'PUBLISHED' })}
          onUnpublish={() => updateSubject.mutate({ status: 'DRAFT' })}
        />
      </div>

      <h2 className="text-sm text-ink-muted mb-3">Bo'limlar</h2>
      <CreateItemForm
        placeholder="Yangi bo'lim nomi (masalan: Kvadrat tenglamalar)"
        isPending={createSection.isPending}
        onSubmit={(title) => createSection.mutate({ title })}
      />

      {sectionsLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sections && sections.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Hali bo'limlar yo'q.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {sections?.map((s) => (
            <ContentRow
              key={s.id}
              title={s.title}
              status={s.status}
              onClick={() => navigate(`/admin/content/sections/${s.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
