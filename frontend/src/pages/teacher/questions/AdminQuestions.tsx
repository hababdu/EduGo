import { useState, useCallback } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function AdminQuestions() {
  const { haptic, hapticNotify } = useTelegram();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Assalomu alaykum! Men EduGo AI yordamchisiman. Sizga test savollarini generatsiya qilish, o'quv materiallarini tayyorlash yoki tahlil qilishda yordam berishga tayyorman.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    haptic('medium');
    const userText = prompt.trim();
    setPrompt('');

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // Bu yerda kelgusida AI backend API ga so'rov ulanadi
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `"${userText}" bo'yicha so'rovingiz qabul qilindi. AI integratsiyasi orqali tez orada to'liq javob qaytarish imkoniyati ishga tushadi!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      hapticNotify('success');
    } catch (err) {
      hapticNotify('error');
      toast('error', 'AI bilan bog\'lanishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, haptic, hapticNotify]);

  const quickPrompts = [
    "🧪 Kimyo fanidan 5 ta test tuzish",
    "📐 Matematika bo'yicha qiyin masalalar",
    "📝 O'quvchilar uchun e'lon matni",
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 pb-32 flex flex-col h-[calc(100vh-70px)]">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md shrink-0">
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          EduGo AI Assistant 🤖
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          Sun'iy intellekt yordamida tezkor kontent yaratish va boshqarish
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              haptic('light');
              setPrompt(qp);
            }}
            className="shrink-0 bg-surface/30 hover:bg-surface/50 text-ink text-xs px-3.5 py-2 rounded-2xl border border-white/5 transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gold text-base rounded-br-sm'
                    : 'bg-surface/30 text-ink border border-white/5 rounded-bl-sm backdrop-blur-md'
                }`}
              >
                <p>{msg.content}</p>
                <span className={`text-[10px] mt-1.5 block opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start">
            <div className="bg-surface/30 p-4 rounded-3xl rounded-bl-sm border border-white/5 backdrop-blur-md animate-pulse">
              <p className="text-xs text-ink-muted">AI o'ylamoqda...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex gap-2 bg-surface/20 p-2 rounded-3xl border border-white/5 backdrop-blur-md shrink-0">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="AI ga savol bering yoki vazifa yozing..."
          className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none text-ink placeholder:text-ink-faint"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !prompt.trim()}
          className="bg-gold text-base px-5 py-2.5 rounded-2xl font-semibold text-xs active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          Yuborish
        </button>
      </div>
    </div>
  );
}

export default AdminQuestions;