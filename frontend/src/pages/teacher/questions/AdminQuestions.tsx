import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ========== GROQ SOZLAMALARI ==========
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'openai/gpt-oss-20b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function AdminQuestions() {
  const { haptic, hapticNotify } = useTelegram();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Assalomu alaykum! 👋 Men Groq asosidagi AI yordamchingizman. Savollaringizni bering!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Avtomatik pastga scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (!GROQ_API_KEY) {
      toast('error', 'Groq API key kiritilmagan!');
      return;
    }

    haptic('light');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const history = [...messages, userMessage]
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                "Sen foydali, do'stona va aniq javob beradigan AI yordamchisan. Javoblarni o'zbek tilida ber. Qisqa va tushunarli bo'lishga harakat qil.",
            },
            ...history,
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Xatolik: ${response.status}`);
      }

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content?.trim() ||
        "Kechirasiz, javob ololmadim.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      hapticNotify('success');
    } catch (err: any) {
      console.error(err);
      hapticNotify('error');
      toast('error', err?.message || 'AI bilan bog‘lanishda xatolik');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, haptic, hapticNotify]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    haptic('medium');
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Chat tozalandi. Yangi savol berishingiz mumkin! ✨",
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
          <p className="text-[11px] text-ink-muted">Groq · Llama 3.1 8B</p>
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
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface/40 border border-white/10 rounded-3xl rounded-bl-lg px-5 py-3.5">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
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
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-11 h-11 rounded-2xl bg-gold text-base flex items-center justify-center active:scale-95 transition disabled:opacity-40 disabled:active:scale-100 shadow-lg shadow-gold/20"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-base/30 border-t-base rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-ink-muted text-center mt-2">
          Enter — yuborish · Shift+Enter — yangi qator
        </p>
      </div>
    </div>
  );
}

export default AdminQuestions;