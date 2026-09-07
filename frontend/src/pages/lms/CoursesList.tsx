import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLms } from '../../hooks/useLms';

export const CoursesList: React.FC = () => {
  const { courses, isLoading, error } = useLms();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 bg-slate-900 min-h-screen">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">📚 Mavjud Kurslar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            {course.posterUrl ? (
              <img src={course.posterUrl} alt={course.title} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                {course.title.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{course.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2">{course.description || "Tavsif berilmagan"}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-medium">
                  {course.subjects?.length || 0} ta Fan
                </span>
                <button
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Ko'rish
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};