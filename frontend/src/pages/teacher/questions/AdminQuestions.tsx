// src/pages/admin/AdminQuestions.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { streamChatWithAI, AIServiceError } from '../../../lib/ai-service';
import { PageHeader, Skeleton } from '../../../components/ui';
import { Send, Square, Trash2, Sparkles } from '../../../design/icons';
import { TEXT, CONTROL, ICON, PAGE } from '../../../design/tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const WELCOME = 'Salom! 👋 Men AI yordamchingizman. Savolingizni bering.';

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
          m.id === assistantId ? { ...m, content: `❌ ${msg}`, isStreaming: false } : m,
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

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-base text-ink">AI Yordamchi</h1>
            <p className={TEXT.tiny}>
              {isLoading ? (
                <span className="text-gold">● Yozilmoqda...</span>
              ) : (
                'Groq · GPT-OSS 20B'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-ink-muted hover:text-ink px-3 py-1.5 rounded-lg bg-white/5 inline-flex items-center gap-1.5 active:scale-95 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Tozalash
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
      <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-surface/20 backdrop-blur-md">
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