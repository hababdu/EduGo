import { useParams, useNavigate } from 'react-router-dom';
import { useTopic, useUpdateTopic, useLessons, useCreateLesson } from '../../../hooks/useContent';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';
import { LessonCard } from '../../../components/admin/content/LessonCard';

export function AdminTopicDetail() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const { data: topic, isLoading: topicLoading } = useTopic(topicId);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(topicId);
  const updateTopic = useUpdateTopic(topicId, (topic?.sectionId as string) ?? '');
  const createLesson = useCreateLesson(topicId);

  if (topicLoading || !topic) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">{topic.title}</h1>
        <PublishToggle
          status={topic.status}
          isPending={updateTopic.isPending}
          onPublish={() => updateTopic.mutate({ status: 'PUBLISHED' })}
          onUnpublish={() => updateTopic.mutate({ status: 'DRAFT' })}
        />
      </div>

      <label className="flex items-center gap-2 mb-8 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={!!topic.sequentialLocked}
          onChange={(e) => updateTopic.mutate({ sequentialLocked: e.target.checked })}
          className="accent-gold"
        />
        Ketma-ket ochilsin (14-band) — oldingi mavzu tugatilmaguncha yopiq
      </label>

      <h2 className="text-sm text-ink-muted mb-3">Darslar</h2>
      <CreateItemForm
        placeholder="Yangi dars nomi (masalan: Video dars 1)"
        isPending={createLesson.isPending}
        onSubmit={(title) => createLesson.mutate({ title })}
      />

      {lessonsLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : lessons && lessons.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Hali darslar yo'q.</p>
      ) : (
        <div className="space-y-3">
          {lessons?.map((l) => (
            <LessonCard key={l.id} lesson={l} topicId={topicId} />
          ))}
        </div>
      )}
    </div>
  );
}
