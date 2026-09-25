/* ============================================================
   AI SERVICE — Markazlashtirilgan Groq integratsiyasi
   ============================================================ */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-20b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/* ---------- Xatolik turi ---------- */
export type AIErrorCode =
  | 'NO_API_KEY'
  | 'NETWORK'
  | 'RATE_LIMIT'
  | 'PARSE'
  | 'UNKNOWN';

export class AIServiceError extends Error {
  code: AIErrorCode;
  retryable: boolean;

  constructor(message: string, code: AIErrorCode, retryable = false) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.retryable = retryable;
  }
}

/* ---------- JSON ni ishonchli parse qilish ---------- */
function safeParseJSON<T>(content: string, fallbackPattern: RegExp): T {
  // 1. To'g'ridan-to'g'ri parse
  try {
    return JSON.parse(content) as T;
  } catch {
    /* davom */
  }

  // 2. Markdown code block ichidan olish
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      /* davom */
    }
  }

  // 3. Pattern bo'yicha olish
  const match = content.match(fallbackPattern);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      /* davom */
    }
  }

  throw new AIServiceError('AI javobi JSON formatida emas', 'PARSE', true);
}

/* ---------- Retry logikasi ---------- */
async function fetchWithRetry(
  body: Record<string, unknown>,
  maxRetries = 2,
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after')) || 2;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        throw new AIServiceError(
          "Juda ko'p so'rov. Iltimos, birozdan so'ng qayta urinib ko'ring.",
          'RATE_LIMIT',
          true,
        );
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new AIServiceError(
          errData?.error?.message || `Server xatoligi: ${response.status}`,
          'UNKNOWN',
          response.status >= 500,
        );
      }

      return await response.json();
    } catch (err: any) {
      lastError = err;

      if (err?.name === 'AbortError') {
        throw new AIServiceError("So'rov vaqti tugadi", 'NETWORK', true);
      }

      if (err instanceof AIServiceError) {
        if (!err.retryable || attempt >= maxRetries) throw err;
      } else if (attempt >= maxRetries) {
        throw new AIServiceError(
          'Tarmoq xatoligi. Internetni tekshiring.',
          'NETWORK',
          true,
        );
      }

      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new AIServiceError("Noma'lum xatolik", 'UNKNOWN');
}

/* ============================================================
   ASOSIY AI CHAQIRUV
   ============================================================ */
interface ChatOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

async function callAI(options: ChatOptions): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new AIServiceError(
      "Groq API key kiritilmagan. .env faylga VITE_GROQ_API_KEY qo'shing.",
      'NO_API_KEY',
    );
  }

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const data = await fetchWithRetry(body);
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AIServiceError("AI bo'sh javob qaytardi", 'UNKNOWN', true);
  }

  return content;
}

/* ============================================================
   TYPES
   ============================================================ */
export type AssignmentCategory = 'LESSON' | 'HOMEWORK' | 'RESOURCE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type DifficultyInput = Difficulty | 'MIXED';

export interface GeneratedMaterial {
  title: string;
  description: string;
  youtubeSearchUrl: string;
}

export interface GeneratedQuestion {
  text: string;
  difficulty: Difficulty;
  points: number;
  options: string[];
  correctAnswerIndex: number;
}

/* ============================================================
   1) MATERIAL GENERATSIYASI
   ============================================================ */
export async function generateMaterial(params: {
  topic: string;
  category: AssignmentCategory;
}): Promise<GeneratedMaterial> {
  const categoryText =
    params.category === 'LESSON'
      ? 'dars mavzusi'
      : params.category === 'HOMEWORK'
        ? 'uy vazifasi'
        : "qo'shimcha resurs";

  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida ta'lim materiallari tuzuvchi professional AI yordamchisan.
Javobni faqat JSON formatida ber:
{
  "title": "qisqa va aniq sarlavha",
  "description": "batafsil tavsif (2-4 gap)",
  "searchQuery": "YouTube qidiruv uchun kalit so'zlar"
}
Qoidalar:
- title qisqa va tushunarli bo'lsin
- description o'quvchilar uchun foydali bo'lsin
- searchQuery mavzuga eng mos video topish uchun yaxshi bo'lsin`,
    userPrompt: `Mavzu: "${params.topic}"\nToifa: ${categoryText}`,
    jsonMode: true,
    temperature: 0.7,
  });

  const parsed = safeParseJSON<{
    title?: string;
    description?: string;
    searchQuery?: string;
  }>(content, /\{[\s\S]*\}/);

  const title = String(parsed.title || params.topic).trim();
  const description = String(parsed.description || '').trim();
  const searchQuery = String(parsed.searchQuery || params.topic).trim();

  return {
    title,
    description,
    youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      searchQuery,
    )}`,
  };
}

/* ============================================================
   2) TEST SAVOLLARI GENERATSIYASI
   ============================================================ */
export async function generateQuestions(params: {
  topic: string;
  count: number;
  difficulty: DifficultyInput;
}): Promise<GeneratedQuestion[]> {
  const difficultyText =
    params.difficulty === 'MIXED'
      ? "oson, o'rta va qiyin aralash"
      : params.difficulty === 'EASY'
        ? 'oson'
        : params.difficulty === 'MEDIUM'
          ? "o'rta"
          : 'qiyin';

  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida test savollari tuzuvchi professional AI yordamchisan.
Faqat JSON qaytar:
{
  "questions": [
    {
      "text": "savol matni",
      "difficulty": "EASY",
      "points": 1,
      "options": ["variant1", "variant2", "variant3", "variant4"],
      "correctAnswerIndex": 0
    }
  ]
}
Qoidalar:
- Har bir savolda aniq 4 ta variant bo'lsin
- correctAnswerIndex 0 dan 3 gacha
- Variantlar aniq, bir-biriga o'xshash bo'lmasin
- Savollar o'zbek tilida va mavzuga mos bo'lsin
- difficulty faqat "EASY" | "MEDIUM" | "HARD" bo'lsin
- points har doim 1 bo'lsin`,
    userPrompt: `Mavzu: "${params.topic}"
Savollar soni: ${params.count}
Qiyinlik: ${difficultyText}

Aynan ${params.count} ta savol qaytar.`,
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 4096,
  });

  const parsed = safeParseJSON<{ questions?: any[] } | any[]>(
    content,
    /\[[\s\S]*\]/,
  );

  const rawQuestions: any[] = Array.isArray(parsed)
    ? parsed
    : parsed.questions || [];

  return rawQuestions
    .map((q: any): GeneratedQuestion => {
      const options = Array.isArray(q.options)
        ? q.options.map((o: any) => String(o).trim()).filter(Boolean)
        : ['', ''];

      const difficulty: Difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(
        q.difficulty,
      )
        ? q.difficulty
        : 'MEDIUM';

      return {
        text: String(q.text || '').trim(),
        difficulty,
        points: Number(q.points) || 1,
        options: options.length >= 2 ? options : ['', ''],
        correctAnswerIndex: Math.max(
          0,
          Math.min(Number(q.correctAnswerIndex) || 0, options.length - 1),
        ),
      };
    })
    .filter((q) => q.text && q.options.length >= 2);
}

/* ============================================================
   3) CHAT (STREAMING)
   ============================================================ */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChatWithAI(params: {
  history: ChatMessage[];
  systemPrompt?: string;
  onChunk: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  if (!GROQ_API_KEY) {
    throw new AIServiceError('Groq API key kiritilmagan', 'NO_API_KEY');
  }

  const systemPrompt =
    params.systemPrompt ||
    "Sen foydali, do'stona va aniq javob beradigan AI yordamchisan. Javoblarni o'zbek tilida ber. Qisqa va tushunarli bo'lishga harakat qil.";

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...params.history],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    throw new AIServiceError(`Stream xatoligi: ${response.status}`, 'NETWORK');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          params.onChunk(delta);
        }
      } catch {
        /* ignore */
      }
    }
  }

  params.onDone?.(fullText);
}