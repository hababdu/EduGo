import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { streamChatWithAI, AIServiceError } from '../../../lib/ai-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const WELCOME_MESSAGE = "Assalomu alaykum! 👋 Men AI yordamchingizman. Savollaringizni bering!";

export function AdminQuestions() {
  const { haptic, hapticNotify } = useTelegram();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Avtomatik scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tozalash — komponent unmount bo'lganda streamni to'xtatish
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    haptic('medium');
  }, [haptic]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    haptic('light');

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantId = `a-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Oxirgi 10 xabarni olish (placeholder'ni hisobga olmasdan)
      const history = [...messages, userMessage]
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await streamChatWithAI({
        history,
        signal: controller.signal,
        onChunk: (chunk) => {
          // Real-time yangilash
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m,
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
          hapticNotify('success');
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Foydalanuvchi to'xtatdi — xabarni saqlab qolish
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content + '\n\n_[to\'xtatildi]_',
                  isStreaming: false,
                }
              : m,
          ),
        );
        return;
      }

      hapticNotify('error');
      const msg =
        err instanceof AIServiceError
          ? err.message
          : 'AI bilan bog\'lanishda xatolik';

      toast('error', msg);

      // Placeholder'ni xatolik bilan almashtirish
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `❌ ${msg}`,
                isStreaming: false,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, haptic, hapticNotify]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (isLoading) handleStop();
    haptic('medium');
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Chat tozalandi. Yangi savol berishingiz mumkin! ✨',
        timestamp: new Date(),
      },
    ]);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface/30 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="font-display text-lg text-ink">AI Yordamchi</h1>
          <p className="text-[11px] text-ink-muted">
            {isLoading ? (
              <span className="text-gold">● Javob yozilmoqda...</span>
            ) : (
              'Groq · GPT-OSS 20B'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-ink-muted hover:text-gold px-3 py-1.5 rounded-xl bg-white/5 active:scale-95 transition"
        >
          Tozalash
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold text-base rounded-br-lg'
                  : 'bg-surface/40 border border-white/10 text-ink rounded-bl-lg'
              }`}
            >
              {msg.content ? (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              ) : (
                <TypingDots />
              )}
              {msg.isStreaming && msg.content && (
                <span className="inline-block w-1.5 h-4 bg-gold ml-0.5 animate-pulse align-middle" />
              )}
              <p
                className={`text-[10px] mt-1.5 ${
                  msg.role === 'user' ? 'text-base/60' : 'text-ink-muted'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('uz-UZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-surface/20 backdrop-blur-md">
        <div className="flex items-end gap-2 bg-surface/40 border border-white/10 rounded-3xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Savolingizni yozing..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none resize-none max-h-[140px] py-2.5 px-1 leading-relaxed disabled:opacity-50"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="shrink-0 w-11 h-11 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center active:scale-95 transition"
              aria-label="To'xtatish"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-11 h-11 rounded-2xl bg-gold text-base flex items-center justify-center active:scale-95 transition disabled:opacity-40 disabled:active:scale-100 shadow-lg shadow-gold/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-ink-muted text-center mt-2">
          Enter — yuborish · Shift+Enter — yangi qator
        </p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 py-1">
      <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default AdminQuestions;