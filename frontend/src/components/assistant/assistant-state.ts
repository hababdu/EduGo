/* ============================================================
   Yordamchi suhbati holati — SOF funksiyalar (React'siz).
   Hodisalar oqimini xabar bo'laklariga (matn / tool / kartochka / izoh)
   aylantiradi va serverga yuboriladigan tarixni quradi.
   ============================================================ */
import type { ActionCard, AssistantEvent, HistoryItem } from '../../lib/assistant-client';

export type CardStatus = 'idle' | 'working' | 'executed' | 'failed' | 'cancelled' | 'expired';

export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; id: string; name: string; label: string; status: 'running' | 'ok' | 'error' }
  | { kind: 'card'; card: ActionCard; status: CardStatus; message?: string }
  | { kind: 'notice'; text: string };

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Part[];
  streaming?: boolean;
  /** Xato matni (qayta urinish tugmasi bilan ko'rsatiladi) */
  error?: string;
}

export const HISTORY_MAX = 20;
export const CONTENT_MAX = 4000;

/** Bitta hodisani xabar bo'laklariga qo'llaydi (o'zgarmas — yangi massiv qaytaradi). */
export function applyEvent(parts: Part[], ev: AssistantEvent): Part[] {
  switch (ev.type) {
    case 'text': {
      const last = parts[parts.length - 1];
      if (last?.kind === 'text') {
        return [...parts.slice(0, -1), { kind: 'text', text: last.text + ev.delta }];
      }
      return [...parts, { kind: 'text', text: ev.delta }];
    }
    case 'tool_start':
      return [...parts, { kind: 'tool', id: ev.id, name: ev.name, label: ev.label, status: 'running' }];
    case 'tool_end':
      return parts.map((p) =>
        p.kind === 'tool' && p.id === ev.id ? { ...p, status: ev.ok ? ('ok' as const) : ('error' as const) } : p,
      );
    case 'confirmation':
      // takroriy kartochka (bir xil id) qo'shilmaydi
      return parts.some((p) => p.kind === 'card' && p.card.id === ev.action.id)
        ? parts
        : [...parts, { kind: 'card', card: ev.action, status: 'idle' }];
    case 'notice':
      return [...parts, { kind: 'notice', text: ev.message }];
  }
}

export function setCardStatus(
  messages: AssistantMessage[],
  cardId: string,
  status: CardStatus,
  message?: string,
): AssistantMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => (p.kind === 'card' && p.card.id === cardId ? { ...p, status, message } : p)),
  }));
}

export function findCard(messages: AssistantMessage[], cardId: string) {
  for (const m of messages) {
    for (const p of m.parts) if (p.kind === 'card' && p.card.id === cardId) return p;
  }
  return undefined;
}

export function messageText(m: AssistantMessage): string {
  return m.parts
    .filter((p): p is Extract<Part, { kind: 'text' }> => p.kind === 'text')
    .map((p) => p.text)
    .join('')
    .trim();
}

/** Kartochka holatini modelga tushunarli qisqa matnga aylantiradi (u amal natijasini bilishi uchun). */
function cardNote(p: Extract<Part, { kind: 'card' }>): string {
  const s = p.card.summary;
  switch (p.status) {
    case 'executed': return `[Amal bajarildi: ${s}]`;
    case 'cancelled': return `[Foydalanuvchi amalni bekor qildi: ${s}]`;
    case 'failed': return `[Amal bajarilmadi: ${s}${p.message ? ` — ${p.message}` : ''}]`;
    case 'expired': return `[Amalning muddati tugadi: ${s}]`;
    default: return `[Tasdiq kutilmoqda, hali bajarilmagan: ${s}]`;
  }
}

/**
 * Serverga yuboriladigan tarix: faqat matn (tool chiplari tashlanadi), kartochkalar esa
 * qisqa izoh sifatida qo'shiladi. Oxirgi HISTORY_MAX ta xabar, har biri CONTENT_MAX belgigacha.
 */
export function buildHistory(messages: AssistantMessage[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const m of messages) {
    const content =
      m.role === 'user'
        ? messageText(m)
        : [
            messageText(m),
            ...m.parts.filter((p): p is Extract<Part, { kind: 'card' }> => p.kind === 'card').map(cardNote),
          ]
            .filter(Boolean)
            .join('\n');
    if (content) items.push({ role: m.role, content: content.slice(0, CONTENT_MAX) });
  }
  return items.slice(-HISTORY_MAX);
}

/** Tasdiq kutayotgan (muddati o'tmagan) kartochkalar soni — launcher'dagi belgi uchun. */
export function countPendingCards(messages: AssistantMessage[], now: number = Date.now()): number {
  let n = 0;
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.kind === 'card' && p.status === 'idle' && new Date(p.card.expiresAt).getTime() > now) n++;
    }
  }
  return n;
}
