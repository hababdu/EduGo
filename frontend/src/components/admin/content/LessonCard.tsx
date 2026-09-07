import { useState } from 'react';
import type { LessonItem } from '../../../hooks/useContent';
import { useAddVideo, useAddMaterial } from '../../../hooks/useContent';

const VIDEO_SOURCES = ['YOUTUBE', 'TELEGRAM', 'EXTERNAL_URL', 'CLOUD_STORAGE'];
const MATERIAL_TYPES = ['PDF', 'DOC', 'PPT', 'IMAGE', 'OTHER'];

export function LessonCard({ lesson, topicId }: { lesson: LessonItem; topicId: string }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSource, setVideoSource] = useState('YOUTUBE');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState('PDF');
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const addVideo = useAddVideo(topicId);
  const addMaterial = useAddMaterial(topicId);

  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-sm font-medium mb-2">{lesson.title}</p>

      {lesson.videos.length > 0 && (
        <div className="space-y-1 mb-2">
          {lesson.videos.map((v) => (
            <p key={v.id} className="text-xs text-teal">
              🎬 {v.source} — {v.url}
            </p>
          ))}
        </div>
      )}
      {lesson.materials.length > 0 && (
        <div className="space-y-1 mb-2">
          {lesson.materials.map((m) => (
            <p key={m.id} className="text-xs text-gold">
              📄 {m.title} ({m.type})
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setShowAddVideo((v) => !v)}
          className="text-xs text-ink-muted underline"
        >
          + Video
        </button>
        <button
          onClick={() => setShowAddMaterial((v) => !v)}
          className="text-xs text-ink-muted underline"
        >
          + Material
        </button>
      </div>

      {showAddVideo && (
        <div className="flex gap-2 mt-3">
          <select
            value={videoSource}
            onChange={(e) => setVideoSource(e.target.value)}
            className="bg-surfaceRaised rounded-lg px-2 py-2 text-xs"
          >
            {VIDEO_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL"
            className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-xs outline-none"
          />
          <button
            onClick={() => {
              if (!videoUrl.trim()) return;
              addVideo.mutate(
                { lessonId: lesson.id, url: videoUrl.trim(), source: videoSource },
                { onSuccess: () => setVideoUrl('') },
              );
            }}
            className="text-xs bg-gold text-base rounded-lg px-3 py-2 font-medium"
          >
            Saqlash
          </button>
        </div>
      )}

      {showAddMaterial && (
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2">
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              className="bg-surfaceRaised rounded-lg px-2 py-2 text-xs"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
              placeholder="Sarlavha"
              className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-xs outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="Fayl URL"
              className="flex-1 bg-surfaceRaised rounded-lg px-3 py-2 text-xs outline-none"
            />
            <button
              onClick={() => {
                if (!materialUrl.trim() || !materialTitle.trim()) return;
                addMaterial.mutate(
                  {
                    lessonId: lesson.id,
                    fileUrl: materialUrl.trim(),
                    title: materialTitle.trim(),
                    type: materialType,
                  },
                  {
                    onSuccess: () => {
                      setMaterialUrl('');
                      setMaterialTitle('');
                    },
                  },
                );
              }}
              className="text-xs bg-gold text-base rounded-lg px-3 py-2 font-medium"
            >
              Saqlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
