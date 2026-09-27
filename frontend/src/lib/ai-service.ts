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
   3) BITTA SAVOLNI QAYTA GENERATSIYA QILISH
   ("🔄 Qayta yaratish" tugmasi uchun — mavjud savollarga
   o'xshamaydigan, yangi bitta savol qaytaradi)
   ============================================================ */
export async function generateSingleQuestion(params: {
  topic: string;
  difficulty: DifficultyInput;
  avoidTexts?: string[];
}): Promise<GeneratedQuestion> {
  const difficultyText =
    params.difficulty === 'MIXED'
      ? "oson, o'rta yoki qiyin (o'zing tanla)"
      : params.difficulty === 'EASY'
        ? 'oson'
        : params.difficulty === 'MEDIUM'
          ? "o'rta"
          : 'qiyin';

  const avoidBlock =
    params.avoidTexts && params.avoidTexts.length > 0
      ? `\n\nBu savollarga o'xshash yoki takrorlanuvchi savol yozma, ulardan farqli va yangi bo'lsin:\n${params.avoidTexts
          .map((t, i) => `${i + 1}. ${t}`)
          .join('\n')}`
      : '';

  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida test savoli tuzuvchi professional AI yordamchisan.
Faqat JSON qaytar:
{
  "text": "savol matni",
  "difficulty": "EASY",
  "points": 1,
  "options": ["variant1", "variant2", "variant3", "variant4"],
  "correctAnswerIndex": 0
}
Qoidalar:
- Aynan 4 ta variant bo'lsin, aniq va bir-biriga o'xshamasin
- correctAnswerIndex 0 dan 3 gacha
- difficulty faqat "EASY" | "MEDIUM" | "HARD" bo'lsin`,
    userPrompt: `Mavzu: "${params.topic}"\nQiyinlik: ${difficultyText}${avoidBlock}\n\nAynan 1 ta savol qaytar.`,
    jsonMode: true,
    temperature: 0.85,
  });

  const parsed = safeParseJSON<any>(content, /\{[\s\S]*\}/);

  const options = Array.isArray(parsed.options)
    ? parsed.options.map((o: any) => String(o).trim()).filter(Boolean)
    : ['', '', '', ''];

  const difficulty: Difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(
    parsed.difficulty,
  )
    ? parsed.difficulty
    : 'MEDIUM';

  return {
    text: String(parsed.text || '').trim(),
    difficulty,
    points: Number(parsed.points) || 1,
    options: options.length >= 2 ? options : ['', '', '', ''],
    correctAnswerIndex: Math.max(
      0,
      Math.min(Number(parsed.correctAnswerIndex) || 0, options.length - 1),
    ),
  };
}

/* ============================================================
   4) JAVOBNI AI YORDAMIDA BAHOLASH
   (ochiq savol / insho / erkin matn javoblari uchun)
   ============================================================ */
export interface GradingResult {
  score: number; // 0-100 oralig'ida foiz
  isCorrect: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function gradeAnswer(params: {
  question: string;
  studentAnswer: string;
  referenceAnswer?: string;
}): Promise<GradingResult> {
  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida ishlaydigan adolatli va rag'batlantiruvchi o'qituvchi-baholovchi AI'san.
O'quvchining javobini baholaysan: mazmun, to'g'rilik va tushunish darajasiga qarab, imlo xatolariga unchalik qattiq qaramasdan.
Faqat JSON qaytar:
{
  "score": 0-100 oralig'idagi son,
  "isCorrect": true yoki false (score >= 60 bo'lsa true),
  "feedback": "o'quvchiga qaratilgan, rag'batlantiruvchi, 2-3 gapli umumiy fikr",
  "strengths": ["javobning kuchli tomoni", "..."],
  "improvements": ["nimani yaxshilash kerak", "..."]
}
Qoidalar:
- Har doim o'zbek tilida, iliq va hurmatli ohangda yoz
- strengths va improvements — har biri 1-3 ta band, qisqa va aniq
- Agar javob bo'sh yoki mavzuga aloqasiz bo'lsa, score past bo'lsin va buni feedback'da muloyimlik bilan tushuntir`,
    userPrompt: `Savol: "${params.question}"
${params.referenceAnswer ? `Namunaviy/kutilgan javob: "${params.referenceAnswer}"\n` : ''}
O'quvchining javobi: "${params.studentAnswer}"`,
    jsonMode: true,
    temperature: 0.4,
  });

  const parsed = safeParseJSON<any>(content, /\{[\s\S]*\}/);

  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));

  return {
    score,
    isCorrect:
      typeof parsed.isCorrect === 'boolean' ? parsed.isCorrect : score >= 60,
    feedback: String(parsed.feedback || '').trim(),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map((s: any) => String(s).trim()).filter(Boolean)
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map((s: any) => String(s).trim()).filter(Boolean)
      : [],
  };
}

/* ============================================================
   5) SHAXSIYLASHTIRILGAN TAVSIYALAR
   (o'quvchining test natijalari tarixiga qarab)
   ============================================================ */
export interface TopicRecommendation {
  topic: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function generateRecommendations(params: {
  results: { topic: string; scorePercent: number }[];
}): Promise<TopicRecommendation[]> {
  const resultsText = params.results
    .map((r) => `- ${r.topic}: ${r.scorePercent}%`)
    .join('\n');

  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida ishlaydigan ta'lim bo'yicha AI maslahatchisan.
O'quvchining turli mavzulardagi test natijalarini ko'rib, qaysi mavzularni takrorlashi kerakligini tavsiya qilasan.
Faqat JSON qaytar:
{
  "recommendations": [
    { "topic": "mavzu nomi", "reason": "nega aynan shu mavzu (1 gap)", "priority": "HIGH" }
  ]
}
Qoidalar:
- Eng past natijali mavzularga HIGH, o'rtachalarga MEDIUM, yaxshi lekin mustahkamlash mumkin bo'lganlarga LOW ber
- Faqat haqiqatan yordam kerak bo'lgan mavzularni qaytar (bo'sh massiv ham bo'lishi mumkin, agar hammasi a'lo bo'lsa)
- Har bir reason qisqa, aniq va rag'batlantiruvchi bo'lsin`,
    userPrompt: `O'quvchining mavzular bo'yicha natijalari:\n${resultsText}`,
    jsonMode: true,
    temperature: 0.5,
  });

  const parsed = safeParseJSON<{ recommendations?: any[] }>(
    content,
    /\{[\s\S]*\}/,
  );

  const list = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
    : [];

  return list
    .map((r: any): TopicRecommendation => ({
      topic: String(r.topic || '').trim(),
      reason: String(r.reason || '').trim(),
      priority: ['HIGH', 'MEDIUM', 'LOW'].includes(r.priority)
        ? r.priority
        : 'MEDIUM',
    }))
    .filter((r) => r.topic);
}

/* ============================================================
   6) DARS REJASI GENERATSIYASI
   (sarlavhadan tashqari — to'liq strukturaviy reja)
   ============================================================ */
export interface LessonStage {
  title: string;
  minutes: number;
  description: string;
}

export interface LessonPlan {
  objective: string;
  stages: LessonStage[];
  materials: string[];
}

export async function generateLessonPlan(params: {
  topic: string;
  durationMinutes: number;
  level?: string;
}): Promise<LessonPlan> {
  const content = await callAI({
    systemPrompt: `Sen o'zbek tilida ishlaydigan tajribali metodist-o'qituvchisan.
Berilgan mavzu va davomiylik bo'yicha to'liq dars rejasini tuzasan.
Faqat JSON qaytar:
{
  "objective": "darsning maqsadi (1-2 gap)",
  "stages": [
    { "title": "Kirish / motivatsiya", "minutes": 5, "description": "bosqichda nima qilinadi" }
  ],
  "materials": ["kerakli material yoki vosita"]
}
Qoidalar:
- stages jami vaqti berilgan davomiylikka teng bo'lsin
- Odatda: kirish, asosiy tushuntirish, amaliyot/mustaqil ish, mustahkamlash/yakun bosqichlari bo'lsin
- Har bir description aniq va amalda qo'llash mumkin bo'lgan bo'lsin`,
    userPrompt: `Mavzu: "${params.topic}"
Davomiyligi: ${params.durationMinutes} daqiqa
Daraja: ${params.level || 'umumiy'}`,
    jsonMode: true,
    temperature: 0.6,
    maxTokens: 2048,
  });

  const parsed = safeParseJSON<any>(content, /\{[\s\S]*\}/);

  const stages: LessonStage[] = Array.isArray(parsed.stages)
    ? parsed.stages.map((s: any) => ({
        title: String(s.title || '').trim(),
        minutes: Number(s.minutes) || 0,
        description: String(s.description || '').trim(),
      }))
    : [];

  return {
    objective: String(parsed.objective || '').trim(),
    stages: stages.filter((s) => s.title),
    materials: Array.isArray(parsed.materials)
      ? parsed.materials.map((m: any) => String(m).trim()).filter(Boolean)
      : [],
  };
}

/* ============================================================
   7) OTA-ONAGA / HISOBOT XABARI GENERATSIYASI
   ============================================================ */
export type ParentMessageTone = 'IJOBIY' | 'OGOHLANTIRISH' | 'NEYTRAL';

export async function generateParentMessage(params: {
  studentName: string;
  context: string;
  tone?: ParentMessageTone;
}): Promise<string> {
  const toneText =
    params.tone === 'IJOBIY'
      ? "quvonchli va maqtovga to'la"
      : params.tone === 'OGOHLANTIRISH'
        ? "xushmuomala, lekin jiddiylikni yetkazadigan"
        : 'neytral va professional';

  const content = await callAI({
    systemPrompt: `Sen o'qituvchi nomidan ota-onalarga xabar yozadigan yordamchisan.
Xabar o'zbek tilida, hurmatli va tushunarli bo'lsin. Faqat xabar matnini qaytar, JSON emas, boshqa hech narsa qo'shma.`,
    userPrompt: `O'quvchi: ${params.studentName}
Vaziyat: ${params.context}
Ohang: ${toneText}

Ota-onaga yuboriladigan qisqa xabar matnini yoz (3-5 gap, salomlashuv va imzo bilan tugatma — faqat asosiy matn).`,
    temperature: 0.7,
  });

  return content.trim();
}

/* ============================================================
   8) AI REPETITOR — tizim prompti generatori
   (streamChatWithAI bilan birga ishlatiladi, systemPrompt sifatida)
   ============================================================ */
export function buildTutorSystemPrompt(params: {
  studentName?: string;
  weakTopics?: string[];
}): string {
  const nameLine = params.studentName
    ? `O'quvchining ismi: ${params.studentName}.`
    : '';

  const weakLine =
    params.weakTopics && params.weakTopics.length > 0
      ? `Bu o'quvchi quyidagi mavzularda qiynalmoqda, imkon bo'lsa javoblaringda shularga urg'u ber: ${params.weakTopics.join(', ')}.`
      : '';

  return `Sen sabr-toqatli, rag'batlantiruvchi AI repetitorsan. ${nameLine}
Vazifang — to'g'ridan-to'g'ri javobni aytib qo'ymasdan, o'quvchini fikrlashga yo'naltirish: yetakchi savollar ber, misollar bilan tushuntir, kichik qadamlarga bo'l.
${weakLine}
Javoblaring o'zbek tilida, qisqa va tushunarli bo'lsin. Agar o'quvchi juda qiynalsa, sekin-asta to'liqroq tushuntirishga o't.
Hech qachon xafa qiluvchi yoki kamsituvchi ohangda yozma — doim ijobiy va qo'llab-quvvatlovchi bo'l.`;
}

/* ============================================================
   9) CHAT (STREAMING)
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