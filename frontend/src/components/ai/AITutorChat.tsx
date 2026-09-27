import { useState, useRef, useEffect, useCallback } from 'react';
import {
  streamChatWithAI,
  buildTutorSystemPrompt,
  AIServiceError,
  type ChatMessage,
} from '../../lib/ai-service';
import { AIGenerateModal } from './AIGenerateModal';

/* ============================================================
   AI TUTOR CHAT — o'quvchi uchun repetitor-chat
   AIGenerateModal qobig'idan foydalanadi: gavda = xabarlar,
   pastki qism (footer) = matn kiritish qatori.
   ============================================================ */

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface AITutorChatProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  /** Test natijalaridan kelib chiqqan zaif mavzular — repetitor shularga urg'u beradi */
  weakTopics?: string[];
}

export function AITutorChat({
  isOpen,
  onClose,
  studentName,
  weakTopics,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const welcomeText = studentName
    ? `Salom, ${studentName}! 👋 Men sening AI repetitoringman. Nimani tushunolmayabsan?`
    : "Salom! 👋 Men sening AI repetitoringman. Nimani tushunolmayabsan?";

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: 'welcome', role: 'assistant', content: welcomeText }]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: DisplayMessage = { id: makeId(), role: 'user', content: text };
    const assistantId = makeId();
    const assistantPlaceholder: DisplayMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history: ChatMessage[] = [...messages, userMessage]
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await streamChatWithAI({
        history,
        systemPrompt: buildTutorSystemPrompt({ studentName, weakTopics }),
        signal: controller.signal,
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        onDone: (fullText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullText, isStreaming: false }
                : m,
            ),
          );
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg =
        err instanceof AIServiceError
          ? err.message
          : "AI bilan bog'lanishda xatolik";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `❌ ${msg}`, isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, studentName, weakTopics]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={handleClose}
      icon="🎓"
      title="AI Repetitor"
      subtitle={
        weakTopics && weakTopics.length > 0
          ? `Diqqat: ${weakTopics.slice(0, 2).join(', ')}`
          : 'Savolingizni bering, birga tushunamiz'
      }
      footer={
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Savolingizni yozing..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink placeholder:text-ink-muted resize-none max-h-[100px] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-2xl bg-gold text-base flex items-center justify-center active:scale-95 transition disabled:opacity-40"
            aria-label="Yuborish"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gold text-base rounded-br-lg'
                  : 'bg-surface/60 border border-white/10 text-ink rounded-bl-lg'
              }`}
            >
              {m.content ? (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              ) : (
                <span className="inline-flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </AIGenerateModal>
  );
}

export default AITutorChat;