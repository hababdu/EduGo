import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLms } from '../../hooks/useLms';
import { SubjectDTO } from '../../types/lms';

export const SubjectDetail: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { getSubjectDetails } = useLms();

  const [subject, setSubject] = useState<SubjectDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId) {
      getSubjectDetails(subjectId).then((data) => {
        setSubject(data);
        setLoading(false);
      });
    }
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 text-center text-white bg-slate-900 min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">Fan topilmadi</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-indigo-600 rounded-lg">
          Orqaga
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-indigo-400 hover:underline flex items-center gap-1"
      >
        ← Orqaga
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">{subject.title}</h1>
      <p className="text-slate-400 text-sm mb-6">{subject.description}</p>

      {/* SECTIONS & TOPICS ACCORDEON */}
      <div className="space-y-6">
        {subject.sections.map((section) => (
          <div key={section.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-lg font-bold text-indigo-300 mb-4">{section.title}</h2>

            <div className="space-y-4">
              {section.topics.map((topic) => (
                <div key={topic.id} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-200">{topic.title}</h3>
                    {topic.sequentialLocked && (
                      <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                        🔒 Ketma-ket o'zlashtirish
                      </span>
                    )}
                  </div>

                  {/* LESSONS LIST */}
                  <div className="space-y-2">
                    {topic.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => navigate(`/lessons/${lesson.id}`)}
                        className="flex items-center justify-between p-3 bg-slate-800/80 rounded-lg border border-slate-700/40 hover:border-indigo-500/60 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-300">▶ {lesson.title}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {lesson.videos.length > 0 ? 'Video var' : ''} {lesson.materials.length > 0 ? '• Fayllar' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};