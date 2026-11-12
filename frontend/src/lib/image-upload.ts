import { apiFetch } from './api-client';

/** Upload a poster image to EduGo and return its public static URL. */
export async function uploadPosterImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Faqat JPG, PNG yoki WebP rasm yuklash mumkin');
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('Rasm hajmi 8 MB dan oshmasin');
  const body = new FormData();
  body.append('file', file);
  const result = await apiFetch<{ url: string }>('/api/v1/upload/image', { method: 'POST', body });
  return result.url;
}
