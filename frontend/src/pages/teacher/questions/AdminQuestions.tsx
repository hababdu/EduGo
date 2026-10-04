// src/pages/admin/AdminQuestions.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { streamChatWithAI, AIServiceError } from '../../../lib/ai-service';
import { StaffHero } from '../../../components/staff';
import { IMAGES } from '../../../design/images';
import { Send, Square, Trash2, Sparkles } from '../../../design/icons';
import { TEXT, PAGE_WIDE } from '../../../design/tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const WELCOME = 'Salom! Men AI yordamchingizman. Savolingizni bering.';

export function AdminQuestions() {
  const { haptic, hapticNotify } = useTelegram();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

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

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantId = `a-${Date.now()}`;
    const placeholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput('');
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await streamChatWithAI({
        history,
        signal: controller.signal,
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        onDone: (full) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: full, isStreaming: false } : m,
            ),
          );
          hapticNotify('success');
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + '\n\n_[to\'xtatildi]_', isStreaming: false }
              : m,
          ),
        );
        return;
      }

      hapticNotify('error');
      const msg = err instanceof AIServiceError ? err.message : 'AI bilan xatolik';
      toast('error', msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Xatolik: ${msg}`, isStreaming: false } : m,
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
        content: 'Chat tozalandi. Yangi savol bering!',
        timestamp: new Date(),
      },
    ]);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const userCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={IMAGES.mathCoding}
        eyebrow="AI yordamchi"
        title="Savollar va javoblar"
        subtitle="Dars, test va savollar bo'yicha AI'dan yordam oling."
        actions={
          <button
            type="button"
            onClick={handleClear}
            className="bg-white/5 text-ink rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 active:scale-[0.98] transition inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Tozalash
          </button>
        }
        footer={
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-ink-muted">
              Savollar: <b className="text-gold tabular-nums">{userCount}</b>
            </span>
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-ink-muted">
              {isLoading ? <span className="text-gold">Yozilmoqda...</span> : 'Groq · GPT-OSS 20B'}
            </span>
          </div>
        }
      />

    <div className="flex flex-col h-[calc(100dvh-340px)] min-h-[420px] rounded-3xl border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold text-base rounded-br-md'
                  : 'bg-surface/40 border border-white/10 text-ink rounded-bl-md'
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
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-white/10 bg-surface/30">
        <div className="flex items-end gap-2 bg-surface/40 border border-white/10 rounded-2xl px-3 py-2">
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
              className="shrink-0 w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center active:scale-95 transition"
              aria-label="To'xtatish"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-gold text-base flex items-center justify-center active:scale-95 transition disabled:opacity-40 disabled:active:scale-100"
              aria-label="Yuborish"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className={TEXT.tiny + ' text-center mt-2'}>
          Enter — yuborish · Shift+Enter — yangi qator
        </p>
      </div>
    </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 py-1">
      <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default AdminQuestions;