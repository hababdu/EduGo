// Material fayllari: yuklash (progress bilan), ko'rish (autentifikatsiyali) va botga yuborish.
import { useAuthStore } from '../store/auth.store';
import { apiFetch, apiFetchRaw, throwApiError } from './api-client';
import { API_URL } from './config';

export type FileKind = 'IMAGE' | 'PDF' | 'VIDEO' | 'FILE';

export interface MaterialFileDto {
  id: string;
  kind: FileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  order?: number;
  /** Ilova ichida ochsa bo'ladimi (≤ 20 MB) */
  previewable: boolean;
}

export const MAX_UPLOAD_MB = 45;
export const ACCEPT =
  '.jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4,.mov,.webm,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip';

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Faylni yuklaydi. XHR — chunki fetch yuklash progressini bermaydi. */
export function uploadMaterialFile(
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<MaterialFileDto> {
  const attempt = (): Promise<{ status: number; body: any }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/v1/materials/files`);
      const { accessToken } = useAuthStore.getState();
      if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      const initData = (window as any).Telegram?.WebApp?.initData;
      if (initData) xhr.setRequestHeader('X-Telegram-Init-Data', initData);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body: any = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* bo'sh */
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new Error("Tarmoq xatosi. Internetni tekshirib qayta urinib ko'ring"));
      xhr.onabort = () => reject(new Error('Yuklash bekor qilindi'));
      signal?.addEventListener('abort', () => xhr.abort());
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });

  return (async () => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      throw new Error(`Fayl juda katta (${MAX_UPLOAD_MB} MB gacha). Katta videoni YouTube'ga yuklab, havolasini qo'ying`);
    }
    let r = await attempt();
    if (r.status === 401) {
      // Token eskirgan bo'lsa — oddiy so'rov orqali yangilab, bir marta qayta urinamiz
      await apiFetch('/api/v1/users/me').catch(() => undefined);
      r = await attempt();
    }
    if (r.status >= 200 && r.status < 300) return r.body as MaterialFileDto;
    const msg = r.body?.message;
    throw new Error(
      r.status === 413
        ? `Fayl juda katta (${MAX_UPLOAD_MB} MB gacha)`
        : (Array.isArray(msg) ? msg[0] : msg) || 'Yuklashda xatolik',
    );
  })();
}

export async function deleteMaterialFile(id: string): Promise<void> {
  await apiFetch(`/api/v1/materials/files/${id}`, { method: 'DELETE' });
}

/** Autentifikatsiyali yuklab olish → blob. 413 bo'lsa `tooLarge` belgisi bilan xato. */
export async function fetchMaterialBlob(id: string): Promise<Blob> {
  const res = await apiFetchRaw(`/api/v1/materials/files/${id}/content`);
  if (res.status === 413) {
    const e = new Error('Fayl 20 MB dan katta — Telegramga yuborish orqali oching') as Error & { tooLarge?: boolean };
    e.tooLarge = true;
    throw e;
  }
  if (!res.ok) await throwApiError(res);
  return res.blob();
}

export async function sendMaterialToChat(id: string): Promise<void> {
  await apiFetch(`/api/v1/materials/files/${id}/send-to-chat`, { method: 'POST' });
}
