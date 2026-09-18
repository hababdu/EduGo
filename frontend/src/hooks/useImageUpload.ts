// src/hooks/useImageUpload.ts
export function getFullUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Pexels URL
  if (path.startsWith('data:')) return path;

  const baseUrl =
    import.meta.env.VITE_API_URL || 'https://edugo-5h4d.onrender.com';

  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}