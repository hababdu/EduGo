import { API_URL } from '../lib/config';

// src/hooks/useImageUpload.ts
export function getFullUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Pexels URL
  if (path.startsWith('data:')) return path;

  const cleanBase = API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}