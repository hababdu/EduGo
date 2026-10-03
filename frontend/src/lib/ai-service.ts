/* ============================================================
   AI SERVICE — backend orqali (POST /api/v1/ai/*)

   MUHIM: bu fayl endi AI provayderiga (Groq/Anthropic) to'g'ridan-to'g'ri
   murojaat QILMAYDI va hech qanday API kalit saqlamaydi. Barcha
   chaqiruvlar backend orqali o'tadi: kalit serverda, rol/limit/anti-cheat
   tekshiruvlari serverda, prompt'lar ham serverda.

   Eksport qilingan funksiya nomlari va tiplar avvalgidek qoldirilgan,
   shuning uchun komponentlar deyarli o'zgarmaydi.
   ============================================================ */
import { apiFetch, apiFetchRaw, ApiError, throwApiError } from './api-client';

/* ---------- Xatolik turi ---------- */
export type AIErrorCode =
  | 'NO_API_KEY' // server AI ni sozlamagan (503)
  | 'NETWORK'
  | 'RATE_LIMIT' // throttler yoki kunlik token limiti (429)
  | 'PARSE' // AI javobini o'qib bo'lmadi (422)
  | 'FORBIDDEN' // rol yoki anti-cheat (403)
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

export function fromStatus(status: number, message: string): AIServiceError {
  switch (status) {
    case 403:
      return new AIServiceError(message, 'FORBIDDEN');
    case 422:
      return new AIServiceError(message, 'PARSE', true);
    case 429:
      return new AIServiceError(message, 'RATE_LIMIT', true);
    case 503:
      return new AIServiceError(message, 'NO_API_KEY');
    case 504:
      return new AIServiceError(message, 'NETWORK', true);
    default:
      return new AIServiceError(message, 'UNKNOWN', status >= 500);
  }
}

/** ApiError / tarmoq xatosini AIServiceError'ga aylantiradi. AbortError o'zgarishsiz qoladi. */
export function toAIError(err: unknown): unknown {
  if (err instanceof AIServiceError) return err;
  if ((err as any)?.name === 'AbortError') return err;
  if (err instanceof ApiError) return fromStatus(err.status, err.message);
  // fetch() tarmoq uzilganda TypeError tashlaydi. Boshqa kutilmagan xatolarni "internet" deb YASHIRMAYMIZ.
  if (err instanceof TypeError) {
    return new AIServiceError('Tarmoq xatoligi. Internetni tekshiring.', 'NETWORK', true);
  }
  return new AIServiceError(
    err instanceof Error && err.message ? err.message : "Noma'lum xatolik",
    'UNKNOWN',
  );
}

async function post<T>(path: string, data: unknown): Promise<T> {
  try {
    return await apiFetch<T>(`/api/v1/ai/${path}`, { method: 'POST', data });
  } catch (err) {
    throw toAIError(err);
  }
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

export interface GradingResult {
  score: number; // 0-100 oralig'ida foiz
  isCorrect: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface TopicRecommendation {
  topic: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

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

export type ParentMessageTone = 'IJOBIY' | 'OGOHLANTIRISH' | 'NEYTRAL';
export type MascotEvent = 'DASHBOARD_CHECKIN' | 'TEST_RESULT' | 'INACTIVITY';

export interface MascotLine {
  text: string;
  mood: 'happy' | 'sad' | 'idle';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ============================================================
   FUNKSIYALAR  (o'qituvchi / admin)
   ============================================================ */
export function generateMaterial(params: {
  topic: string;
  category: AssignmentCategory;
}): Promise<GeneratedMaterial> {
  return post('material', { topic: params.topic, category: params.category });
}

export async function generateQuestions(params: {
  topic: string;
  count: number;
  difficulty: DifficultyInput;
}): Promise<GeneratedQuestion[]> {
  const res = await post<{ questions: GeneratedQuestion[] }>('questions', {
    topic: params.topic,
    count: params.count,
    difficulty: params.difficulty,
  });
  return res.questions;
}

/** "🔄 Qayta yaratish" — mavjud savollarga o'xshamaydigan bitta yangi savol. */
export function generateSingleQuestion(params: {
  topic: string;
  difficulty: DifficultyInput;
  avoidTexts?: string[];
}): Promise<GeneratedQuestion> {
  return post('question', {
    topic: params.topic,
    difficulty: params.difficulty,
    ...(params.avoidTexts?.length
      ? { avoidTexts: params.avoidTexts.slice(0, 50).map((t) => t.slice(0, 500)) }
      : {}),
  });
}

export function generateLessonPlan(params: {
  topic: string;
  durationMinutes: number;
  level?: string;
}): Promise<LessonPlan> {
  return post('lesson-plan', {
    topic: params.topic,
    durationMinutes: params.durationMinutes,
    ...(params.level ? { level: params.level } : {}),
  });
}

export async function generateParentMessage(params: {
  studentName: string;
  context: string;
  tone?: ParentMessageTone;
}): Promise<string> {
  const res = await post<{ message: string }>('parent-message', {
    studentName: params.studentName,
    context: params.context,
    ...(params.tone ? { tone: params.tone } : {}),
  });
  return res.message;
}

/* ============================================================
   FUNKSIYALAR  (o'quvchi; test paytida server cheklaydi)
   ============================================================ */
export function gradeAnswer(params: {
  question: string;
  studentAnswer: string;
  referenceAnswer?: string;
}): Promise<GradingResult> {
  return post('grade', {
    question: params.question,
    studentAnswer: params.studentAnswer,
    ...(params.referenceAnswer ? { referenceAnswer: params.referenceAnswer } : {}),
  });
}

export async function generateRecommendations(params: {
  results: { topic: string; scorePercent: number }[];
}): Promise<TopicRecommendation[]> {
  const res = await post<{ recommendations: TopicRecommendation[] }>('recommendations', {
    results: params.results.map((r) => ({ topic: r.topic, scorePercent: r.scorePercent })),
  });
  return res.recommendations;
}

export function generateMascotLine(params: {
  event: MascotEvent;
  /** e'tiborsiz qoldiriladi: ism serverda bazadan olinadi (eski chaqiruvlar buzilmasligi uchun qoldirilgan) */
  studentName?: string;
  percent?: number;
  passed?: boolean;
  streak?: number;
  recentFailCount?: number;
  daysSinceLastActivity?: number;
}): Promise<MascotLine> {
  const { studentName: _ignored, ...rest } = params;
  const body = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  return post('mascot', body);
}

/* ============================================================
   CHAT (STREAMING, SSE)
   mode 'tutor'   — o'quvchi repetitori (system prompt serverda quriladi)
   mode 'general' — o'qituvchi/admin uchun umumiy yordamchi (standart)
   ============================================================ */
export async function streamChatWithAI(params: {
  history: ChatMessage[];
  mode?: 'general' | 'tutor';
  /** faqat mode='tutor' uchun: repetitor urg'u beradigan mavzular */
  weakTopics?: string[];
  onChunk: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const tutor = params.mode === 'tutor';

  let res: Response;
  try {
    res = await apiFetchRaw(`/api/v1/ai/${tutor ? 'tutor' : 'chat'}/stream`, {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      signal: params.signal,
      data: {
        history: params.history
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
        ...(tutor && params.weakTopics?.length
          ? { weakTopics: params.weakTopics.slice(0, 10).map((t) => t.slice(0, 100)) }
          : {}),
      },
    });
    if (!res.ok) await throwApiError(res);
  } catch (err) {
    throw toAIError(err);
  }

  if (!res.body) throw new AIServiceError('Stream ochilmadi', 'NETWORK', true);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let finished = false;

  // Bitta SSE blokini (bo'sh qator bilan ajratilgan) qayta ishlaydi
  const handleBlock = (block: string) => {
    let event = '';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    if (!dataLines.length) return;
    const data = dataLines.join('\n');

    if (data === '[DONE]') {
      finished = true;
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === 'error') {
      throw fromStatus(Number(parsed.status) || 502, parsed.message || 'AI xizmatida xatolik');
    }
    if (typeof parsed.delta === 'string' && parsed.delta) {
      fullText += parsed.delta;
      params.onChunk(parsed.delta);
    }
  };

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        handleBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (buffer.trim()) handleBlock(buffer);
  } catch (err) {
    throw toAIError(err);
  } finally {
    reader.cancel().catch(() => undefined); // to'xtatilgan bo'lsa server ham upstream so'rovni yopadi
  }

  params.onDone?.(fullText);
}
