// src/hooks/useImageUpload.ts
import { useState } from 'react';
import apiClient from '../api/client';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[upload] Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,                     // ✅ Brauzerda `type` ishlatiladi
      });

      const response = await apiClient.post<UploadResult>(
        '/api/v1/upload/image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('[upload] Success:', response.data);

      return response.data;
    } catch (err: any) {
      console.error('[upload] Error:', err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Rasm yuklashda xatolik';
      setError(Array.isArray(msg) ? msg[0] : msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
}

/* ============================================================
   To'liq URL olish
   ============================================================ */
export function getFullUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path; // base64 — fallback

  const baseUrl =
    import.meta.env.VITE_API_URL || 'https://edugo-5h4d.onrender.com';

  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}