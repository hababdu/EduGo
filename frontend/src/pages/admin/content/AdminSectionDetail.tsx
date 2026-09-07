import { useParams, useNavigate } from 'react-router-dom';
import { useSection, useUpdateSection, useTopics, useCreateTopic } from '../../../hooks/useContent';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';

export function AdminSectionDetail() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();
  const { data: section, isLoading: sectionLoading } = useSection(sectionId);
  const { data: topics, isLoading: topicsLoading } = useTopics(sectionId);
  const updateSection = useUpdateSection(sectionId, (section?.subjectId as string) ?? '');
  const createTopic = useCreateTopic(sectionId);

  if (sectionLoading || !section) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">{section.title}</h1>
        <PublishToggle
          status={section.status}
          isPending={updateSection.isPending}
          onPublish={() => updateSection.mutate({ status: 'PUBLISHED' })}
          onUnpublish={() => updateSection.mutate({ status: 'DRAFT' })}
        />
      </div>

      <h2 className="text-sm text-ink-muted mb-3">Mavzular</h2>
      <CreateItemForm
        placeholder="Yangi mavzu nomi (masalan: Chiziqli tenglamalar)"
        isPending={createTopic.isPending}
        onSubmit={(title) => createTopic.mutate({ title })}
      />

      {topicsLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : topics && topics.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Hali mavzular yo'q.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {topics?.map((t) => (
            <ContentRow
              key={t.id}
              title={t.title}
              status={t.status}
              subtitle={t.sequentialLocked ? '🔒 Ketma-ket ochiladi' : undefined}
              onClick={() => navigate(`/admin/content/topics/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
