import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLms } from '../../hooks/useLms';
import { LessonDTO, VideoSource } from '../../types/lms';

export const LessonView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { getLessonDetails, updateVideoProgress } = useLms();

  const [lesson, setLesson] = useState<LessonDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lessonId) {
      getLessonDetails(lessonId).then((data) => {
        setLesson(data);
        setLoading(false);
      });
    }
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 text-center text-white bg-slate-900 min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-400 mb-4">Dars topilmadi</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-indigo-600 rounded-lg">
          Orqaga qaytish
        </button>
      </div>
    );
  }

  const primaryVideo = lesson.videos[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-4xl mx-auto">
      {/* HEADER */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-indigo-400 hover:underline flex items-center gap-1"
      >
        ← Orqaga
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">{lesson.title}</h1>

      {/* VIDEO PLAYER SECTION */}
      {primaryVideo && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 mb-6 shadow-xl">
          <div className="aspect-video w-full bg-black flex items-center justify-center">
            {primaryVideo.source === VideoSource.YOUTUBE ? (
              <iframe
                src={primaryVideo.url.replace('watch?v=', 'embed/')}
                title={lesson.title}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <video
                src={primaryVideo.url}
                controls
                className="w-full h-full"
                onEnded={() => updateVideoProgress(primaryVideo.id, 100)}
              />
            )}
          </div>
        </div>
      )}

      {/* MATERIALS & PDF SECTION */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-indigo-300">📁 Dars Materiallari</h2>
        {lesson.materials.length === 0 ? (
          <p className="text-slate-400 text-sm">Birikilgan materiallar yo'q</p>
        ) : (
          <div className="space-y-3">
            {lesson.materials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/60"
              >
                <div>
                  <span className="font-medium text-slate-200 block">{mat.title}</span>
                  <span className="text-xs text-indigo-400 uppercase">{mat.type}</span>
                </div>
                {mat.downloadable && (
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/40 text-sm font-medium transition-colors"
                  >
                    Yuklab olish
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};