import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, useUpdateCourse, useSubjects, useCreateSubject } from '../../../hooks/useContent';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';
import { PublishToggle } from '../../../components/admin/content/PublishToggle';

export function AdminCourseDetail() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: subjects, isLoading: subjectsLoading } = useSubjects(courseId);
  const updateCourse = useUpdateCourse(courseId);
  const createSubject = useCreateSubject(courseId);

  if (courseLoading || !course) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/teacher/content/courses')} className="text-sm text-ink-muted mb-6">
        ← Kurslar
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">{course.title}</h1>
        <PublishToggle
          status={course.status}
          isPending={updateCourse.isPending}
          onPublish={() => updateCourse.mutate({ status: 'PUBLISHED' })}
          onUnpublish={() => updateCourse.mutate({ status: 'DRAFT' })}
        />
      </div>

      <h2 className="text-sm text-ink-muted mb-3">Fanlar</h2>
      <CreateItemForm
        placeholder="Yangi fan nomi (masalan: Algebra)"
        isPending={createSubject.isPending}
        onSubmit={(title) => createSubject.mutate({ title })}
      />

      {subjectsLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : subjects && subjects.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Hali fanlar yo'q.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {subjects?.map((s) => (
            <ContentRow
              key={s.id}
              title={s.title}
              status={s.status}
              onClick={() => navigate(`/admin/content/subjects/${s.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
