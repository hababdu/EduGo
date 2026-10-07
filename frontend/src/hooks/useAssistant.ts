/* ============================================================
   useAssistant — AI yordamchi suhbati (holat + oqim + tasdiqlash).
   Komponent mounted turguncha suhbat saqlanadi (oyna yopilsa ham).
   ============================================================ */
import { useCallback, useRef, useState } from 'react';
import { AIServiceError } from '../lib/ai-service';
import {
  ActionError,
  cancelAction,
  confirmAction,
  fetchPendingActions,
  streamAssistant,
} from '../lib/assistant-client';
import { hapticNotify } from '../lib/telegram';
import { toast } from '../components/ui/Toast';
import {
  applyEvent,
  buildHistory,
  countPendingCards,
  findCard,
  messageText,
  setCardStatus,
  type AssistantMessage,
  type CardStatus,
} from '../components/assistant/assistant-state';

let counter = 0;
const makeId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

const isAbort = (err: unknown) => (err as { name?: string })?.name === 'AbortError';

function friendlyError(err: unknown): string {
  if (err instanceof AIServiceError) {
    switch (err.code) {
      case 'NO_API_KEY':
        return 'Yordamchi hozircha sozlanmagan. Administratorga murojaat qiling.';
      case 'NETWORK':
        return "Internet bilan muammo. Qayta urinib ko'ring.";
      default:
        return err.message; // 403 (test paytida), 429 (limit) — serverning o'zbekcha xabari
    }
  }
  return 'Kutilmagan xatolik yuz berdi';
}

/** Server xatosini kartochka holatiga aylantiradi. */
export function cardStatusFromError(err: ActionError): { status: CardStatus; message: string } {
  const msg = err.message;
  if (err.status === 410) return { status: 'expired', message: msg };
  if (err.status === 409) {
    if (/bajarilgan/.test(msg)) return { status: 'executed', message: msg };
    if (/bekor/.test(msg)) return { status: 'cancelled', message: msg };
    if (/muddati/.test(msg)) return { status: 'expired', message: msg };
    return { status: 'failed', message: msg };
  }
  if (err.status === 0) {
    // Server javobi noma'lum: amal bajarilgan bo'lishi ham mumkin. Qayta urinishga ruxsat (server 409 bilan aniq javob beradi).
    return { status: 'idle', message: "Tarmoq xatoligi. Holat noma'lum — qayta urinib ko'ring." };
  }
  return { status: 'failed', message: msg };
}

export function useAssistant({ page }: { page?: string }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);

  // Callback'lar barqaror bo'lishi uchun eng so'nggi qiymatlar ref'larda
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pageRef = useRef(page);
  pageRef.current = page;
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  const patch = useCallback((id: string, fn: (m: AssistantMessage) => AssistantMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const run = useCallback(
    async (text: string, base: AssistantMessage[]) => {
      const userMsg: AssistantMessage = { id: makeId(), role: 'user', parts: [{ kind: 'text', text }] };
      const asstId = makeId();
      const history = buildHistory([...base, userMsg]);

      setMessages([...base, userMsg, { id: asstId, role: 'assistant', parts: [], streaming: true }]);
      busyRef.current = true;
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await streamAssistant({
          history,
          page: pageRef.current,
          signal: ctrl.signal,
          onEvent: (ev) => patch(asstId, (m) => ({ ...m, parts: applyEvent(m.parts, ev) })),
        });
        patch(asstId, (m) => ({ ...m, streaming: false }));
      } catch (err) {
        patch(asstId, (m) => ({ ...m, streaming: false, ...(isAbort(err) ? {} : { error: friendlyError(err) }) }));
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patch],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      void run(text, messagesRef.current);
    },
    [run],
  );

  /** Xato bilan tugagan oxirgi savolni qayta yuboradi. */
  const retry = useCallback(() => {
    if (busyRef.current) return;
    const all = messagesRef.current;
    let idx = -1;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].role === 'user') {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    void run(messageText(all[idx]), all.slice(0, idx));
  }, [run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  /* ───── Tasdiqlash / bekor qilish ───── */

  const confirm = useCallback(async (cardId: string) => {
    const card = findCard(messagesRef.current, cardId);
    if (!card || card.status !== 'idle') return; // ikki marta bosishdan himoya (server ham atomik)
    setMessages((prev) => setCardStatus(prev, cardId, 'working'));
    try {
      const res = await confirmAction(cardId);
      setMessages((prev) => setCardStatus(prev, cardId, 'executed', res.message));
      hapticNotify('success');
      toast('success', 'Amal bajarildi');
    } catch (err) {
      if (err instanceof ActionError) {
        const { status, message } = cardStatusFromError(err);
        setMessages((prev) => setCardStatus(prev, cardId, status, message));
        hapticNotify('error');
        toast(status === 'executed' ? 'info' : 'error', message);
      } else {
        setMessages((prev) => setCardStatus(prev, cardId, 'failed', 'Kutilmagan xatolik'));
        toast('error', 'Kutilmagan xatolik');
      }
    }
  }, []);

  const cancel = useCallback(async (cardId: string) => {
    const card = findCard(messagesRef.current, cardId);
    if (!card || card.status !== 'idle') return;
    setMessages((prev) => setCardStatus(prev, cardId, 'working'));
    try {
      await cancelAction(cardId);
      setMessages((prev) => setCardStatus(prev, cardId, 'cancelled'));
    } catch (err) {
      if (err instanceof ActionError) {
        const { status, message } = cardStatusFromError(err);
        setMessages((prev) => setCardStatus(prev, cardId, status, message));
        toast('error', message);
      } else {
        setMessages((prev) => setCardStatus(prev, cardId, 'idle'));
      }
    }
  }, []);

  /** Oyna ochilganda: sahifa yangilangan bo'lsa ham tasdiq kutayotgan kartochkalarni tiklaydi. */
  const restorePending = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const cards = await fetchPendingActions();
      const known = new Set<string>();
      for (const m of messagesRef.current) for (const p of m.parts) if (p.kind === 'card') known.add(p.card.id);
      const fresh = cards.filter((c) => !known.has(c.id));
      if (!fresh.length) return;
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          parts: [
            { kind: 'text', text: 'Tasdiq kutayotgan amallar:' },
            ...fresh.map((card) => ({ kind: 'card' as const, card, status: 'idle' as const })),
          ],
        },
      ]);
    } catch {
      /* jim: bu qo'shimcha qulaylik, asosiy oqimga xalaqit bermasin */
    }
  }, []);

  return {
    messages,
    busy,
    pendingCount: countPendingCards(messages),
    send,
    retry,
    stop,
    reset,
    confirm,
    cancel,
    restorePending,
  };
}

export type AssistantApi = ReturnType<typeof useAssistant>;
