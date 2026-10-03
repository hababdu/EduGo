/* ============================================================
   AI YORDAMCHI — backend mijozi (POST /api/v1/assistant/*)
   Model hech narsani o'zi bajarmaydi: yozuvchi amallar uchun server
   "tasdiqlash kartochkasi" yuboradi va amal faqat foydalanuvchi
   tugmani bosganda (confirm) bajariladi.
   ============================================================ */
import { apiFetch, apiFetchRaw, ApiError, throwApiError } from './api-client';
import { AIServiceError, fromStatus, toAIError } from './ai-service';
import { readSseFrames } from './sse';

export type ActionRisk = 'MEDIUM' | 'HIGH';

export interface ActionCard {
  id: string;
  tool: string;
  /** Matnni SERVER quradi (model emas) */
  summary: string;
  details: { label: string; value: string }[];
  risk: ActionRisk;
  /** ISO sana */
  expiresAt: string;
}

export type AssistantEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | { type: 'tool_end'; id: string; name: string; ok: boolean }
  | { type: 'confirmation'; action: ActionCard }
  | { type: 'notice'; message: string };

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const PAGE_RE = /^\/[A-Za-z0-9\-_/]*$/;

/** Server faqat xavfsiz belgili yo'lni qabul qiladi (aks holda 400) — mos kelmasa yubormaymiz. */
export function safePage(pathname: string | undefined): string | undefined {
  return pathname && pathname.length <= 120 && PAGE_RE.test(pathname) ? pathname : undefined;
}

export async function streamAssistant(params: {
  history: HistoryItem[];
  page?: string;
  signal?: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}): Promise<void> {
  const page = safePage(params.page);

  let res: Response;
  try {
    res = await apiFetchRaw('/api/v1/assistant/chat', {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      signal: params.signal,
      data: {
        history: params.history
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
        ...(page ? { page } : {}),
      },
    });
    if (!res.ok) await throwApiError(res);
  } catch (err) {
    throw toAIError(err);
  }
  if (!res.body) throw new AIServiceError('Oqim ochilmadi', 'NETWORK', true);

  try {
    for await (const frame of readSseFrames(res.body)) {
      if (frame.data === '[DONE]') return;
      let parsed: any;
      try {
        parsed = JSON.parse(frame.data);
      } catch {
        continue;
      }
      if (frame.event === 'error') {
        throw fromStatus(Number(parsed.status) || 502, parsed.message || 'AI xizmatida xatolik');
      }
      if (parsed && typeof parsed.type === 'string') params.onEvent(parsed as AssistantEvent);
    }
  } catch (err) {
    throw toAIError(err);
  }
}

/* ============ Tasdiqlash / bekor qilish ============ */

/** HTTP holati saqlanadi: 409 = allaqachon bajarilgan/bekor, 410 = muddati tugagan, 404 = topilmadi... */
export class ActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ActionError';
    this.status = status;
  }
}

async function actionCall<T>(path: string, method: 'GET' | 'POST'): Promise<T> {
  try {
    return await apiFetch<T>(`/api/v1/assistant/${path}`, { method });
  } catch (err) {
    if (err instanceof ApiError) throw new ActionError(err.status, err.message);
    if (err instanceof TypeError) throw new ActionError(0, 'Tarmoq xatoligi. Internetni tekshiring.');
    throw err;
  }
}

export const confirmAction = (id: string) =>
  actionCall<{ id: string; status: 'EXECUTED'; message: string }>(`actions/${encodeURIComponent(id)}/confirm`, 'POST');

export const cancelAction = (id: string) =>
  actionCall<{ id: string; status: 'CANCELLED' }>(`actions/${encodeURIComponent(id)}/cancel`, 'POST');

/** Sahifa yangilangandan keyin tasdiq kutayotgan kartochkalarni tiklash uchun. */
export const fetchPendingActions = () => actionCall<ActionCard[]>('actions/pending', 'GET');
