import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  streamChatWithAI,
  AIServiceError,
  type ChatMessage,
} from '../../lib/ai-service';
import { AIGenerateModal } from './AIGenerateModal';
import { RichText } from '../assistant/RichText';
import { LiveBot, useMascot, type AttachedFile } from './mascot-context';
import { CHAT_FILE_ACCEPT, ChatFileError, readChatFile } from '../../lib/chat-file';
import { toast } from '../ui/Toast';

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
  /** Foydalanuvchi xabarida ko'rinadigan matn (content'da fayl mazmuni ham bo'lishi mumkin) */
  shown?: string;
  fileName?: string;
}

const QUICK_PROMPTS = [
  'Bu mavzuni oddiy tushuntir',
  'Misol keltirib ber',
  'Menga 3 ta mashq ber',
  'Qisqa xulosa qil',
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface AITutorChatProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  /** Test natijalaridan kelib chiqqan zaif mavzular — repetitor shularga urg'u beradi */
  weakTopics?: string[];
  /** Sarlavha ostidagi qator (masalan, "Repetitor | Murabbiy" almashtirgich) */
  headerSlot?: ReactNode;
}

export function AITutorChat({
  isOpen,
  onClose,
  studentName,
  weakTopics,
  headerSlot,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<AttachedFile | null>(null);
  const { react, takeFile } = useMascot();

  // Robotga tashlangan fayl chat ochilganda shu yerga keladi
  useEffect(() => {
    if (!isOpen) return;
    const f = takeFile();
    if (f) setFile(f);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const attach = async (f: File | undefined) => {
    if (!f) return;
    try {
      setFile(await readChatFile(f));
    } catch (err) {
      toast('error', err instanceof ChatFileError ? err.message : "Faylni o'qib bo'lmadi");
    }
  };

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

  const handleSend = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if ((!text && !file) || isLoading) return;

    const question = (text || 'Shu fayl nima haqida? Qisqacha tushuntirib ber.').slice(0, 1500);
    const content = file
      ? `Quyidagi fayl asosida javob ber.\n\n[Fayl: ${file.name}${file.truncated ? ' (boshlanishi)' : ''}]\n\"\"\"\n${file.text}\n\"\"\"\n\nSavol: ${question}`
      : question;
    const userMessage: DisplayMessage = {
      id: makeId(),
      role: 'user',
      content,
      shown: question,
      fileName: file?.name,
    };
    const assistantId = makeId();
    const assistantPlaceholder: DisplayMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    setFile(null);
    setIsLoading(true);
    react('thinking');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fayl mazmuni faqat eng oxirgi fayl xabarida yuboriladi (token tejash); eskilari qisqa ko'rinishda
      const all = [...messages, userMessage].filter((m) => !m.isStreaming).slice(-10);
      let lastFile = -1;
      all.forEach((m, i) => { if (m.fileName) lastFile = i; });
      const history: ChatMessage[] = all.map((m, i) => ({
        role: m.role,
        content: m.fileName && i !== lastFile ? `[Fayl: ${m.fileName}] ${m.shown ?? ''}` : m.content,
      }));

      await streamChatWithAI({
        history,
        mode: 'tutor', // system prompt serverda quriladi (ism bazadan olinadi)
        weakTopics,
        signal: controller.signal,
        onChunk: (chunk) => {
          react('working');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        onDone: (fullText) => {
          react('finished');
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
      if (err?.name === 'AbortError') { react('idle'); return; }
      react('error');
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
  }, [input, file, isLoading, messages, weakTopics, react]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={handleClose}
      icon="🎓"
      variant="island"
      iconNode={<LiveBot />}
      headerSlot={headerSlot}
      title="AI Repetitor"
      subtitle={
        weakTopics && weakTopics.length > 0
          ? `Diqqat: ${weakTopics.slice(0, 2).join(', ')}`
          : 'Savolingizni bering, birga tushunamiz'
      }
      footer={
        <div>
          {file && (
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full bg-gold/10 border border-gold/25 pl-3 pr-1.5 py-1 text-[11px] text-gold">
              <span aria-hidden="true">📄</span>
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                type="button"
                aria-label="Faylni olib tashlash"
                onClick={() => setFile(null)}
                className="w-5 h-5 rounded-full bg-white/10 text-ink-muted flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void attach(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Fayl biriktirish"
            className="shrink-0 w-11 h-11 rounded-2xl bg-white/5 text-ink-muted flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            📎
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={file ? 'Fayl haqida savol yozing...' : 'Savolingizni yozing...'}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink placeholder:text-ink-muted resize-none max-h-[100px] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || (!input.trim() && !file)}
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
              {m.role === 'user' ? (
                <>
                  {m.fileName && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold">
                      📄 {m.fileName}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.shown ?? m.content}</p>
                </>
              ) : m.content ? (
                <div className="break-words">
                  <RichText text={m.content} />
                </div>
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
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleSend(q)}
                className="rounded-full border border-gold/25 bg-gold/5 px-3 py-1.5 text-[11px] font-semibold text-gold active:scale-95 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </AIGenerateModal>
  );
}

export default AITutorChat;