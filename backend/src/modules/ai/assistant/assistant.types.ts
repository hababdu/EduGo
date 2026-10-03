// src/modules/ai/assistant/assistant.types.ts
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

/** Tool ko'rinishi uchun rol. SUPER_ADMIN = ADMIN; noma'lum rol = eng kam huquqli (STUDENT). */
export type ToolRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export function effectiveRole(role: string): ToolRole {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'ADMIN';
  if (role === 'TEACHER') return 'TEACHER';
  return 'STUDENT';
}

export interface AssistantTool<I = any> {
  /** Modelga ko'rinadigan noyob nom (snake_case) */
  name: string;
  /** Foydalanuvchiga ko'rsatiladigan qisqa holat matni: "Natijalaringiz tekshirilmoqda…" */
  label: string;
  /** Modelga: tool nima qiladi va QACHON ishlatiladi */
  description: string;
  /** JSON Schema (type: 'object') */
  inputSchema: Record<string, unknown>;
  /** Qaysi rollarga ko'rinadi. Model boshqa rolning tool'ini umuman KO'RMAYDI. */
  roles: ToolRole[];
  /** Modeldan kelgan (ishonchsiz!) kirishni tekshiradi va tozalaydi. Xato bo'lsa ToolInputError. */
  parse(raw: unknown): I;
  /** Mavjud servislarni so'rovchi foydalanuvchi nomidan chaqiradi (RBAC/ownership shu servislarda). */
  run(user: CurrentUserPayload, input: I): Promise<unknown>;
}

/** Tip inferensiyasi uchun yordamchi. */
export function defineTool<I>(tool: AssistantTool<I>): AssistantTool<I> {
  return tool;
}

export type ActionRisk = 'MEDIUM' | 'HIGH';

/** Tasdiqlash kartochkasi: matnni SERVER quradi (model emas), shuning uchun model amalni yashirib ko'rsata olmaydi. */
export interface ActionCard {
  id: string;
  tool: string;
  summary: string;
  details: { label: string; value: string }[];
  risk: ActionRisk;
  expiresAt: string;
}

/**
 * YOZUVCHI tool. Model uni chaqirganda HECH NARSA bajarilmaydi: `prepare` holatni tekshiradi va
 * kartochka matnini quradi, amal PENDING saqlanadi. `execute` faqat foydalanuvchi tasdiqlagandan keyin
 * (confirm endpointi) chaqiriladi — mavjud servis orqali, so'rovchi nomidan.
 */
export interface AssistantWriteTool<I = any> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  roles: ToolRole[];
  risk: ActionRisk;
  parse(raw: unknown): I;
  /** Yon ta'sirsiz. Mavjudlik/ruxsatni tekshiradi (xato bo'lsa HttpException) va kartochka matnini quradi. */
  prepare(user: CurrentUserPayload, input: I): Promise<{ summary: string; details: { label: string; value: string }[] }>;
  /** Haqiqiy bajarish. Servisning o'z ruxsat tekshiruvlari ishlaydi (holat o'zgargan bo'lishi mumkin). */
  execute(user: CurrentUserPayload, input: I): Promise<unknown>;
}

export function defineWriteTool<I>(tool: AssistantWriteTool<I>): AssistantWriteTool<I> {
  return tool;
}

/** Klientga SSE orqali yuboriladigan hodisalar */
export type AssistantEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | { type: 'tool_end'; id: string; name: string; ok: boolean }
  | { type: 'confirmation'; action: ActionCard }
  | { type: 'notice'; message: string };
