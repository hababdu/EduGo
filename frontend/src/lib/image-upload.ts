import { apiFetch } from './api-client';

export type PosterPurpose = 'SCHOOL_POSTER' | 'GROUP_POSTER';

/** Uploads poster bytes directly to the school's private Telegram channel. */
export async function uploadPosterImage(file: File, purpose: PosterPurpose = 'SCHOOL_POSTER'): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Faqat JPG, PNG yoki WebP rasm yuklash mumkin');
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('Rasm hajmi 8 MB dan oshmasin');
  const body = new FormData();
  body.append('file', file);
  const result = await apiFetch<{ url: string }>(`/api/v1/upload/image?purpose=${purpose}`, { method: 'POST', body });
  return result.url;
}
