import { useNavigate } from 'react-router-dom';
import { useCourses, useCreateCourse } from '../../../hooks/useContent';
import { ContentRow } from '../../../components/admin/content/ContentRow';
import { CreateItemForm } from '../../../components/admin/content/CreateItemForm';

export function AdminCourses() {
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl mb-6">Kurslar</h1>

      <CreateItemForm
        placeholder="Yangi kurs nomi (masalan: Matematika kursi)"
        isPending={createCourse.isPending}
        onSubmit={(title) => createCourse.mutate({ title })}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : courses && courses.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">
          Hali kurslar yo'q. Yuqoridan birinchisini qo'shing.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {courses?.map((c) => (
            <ContentRow
              key={c.id}
              title={c.title}
              status={c.status}
              onClick={() => navigate(`/teacher/content/courses/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
