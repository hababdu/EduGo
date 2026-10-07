// src/modules/ai/assistant/tool-input.ts
//
// Modeldan kelgan tool argumentlari ISHONCHSIZ (prompt injection yoki oddiy xato bo'lishi mumkin).
// Har bir tool o'z kirishini shu yerdagi yordamchilar bilan qat'iy tekshiradi.
// Xabarlar modelga qaytariladi (u o'zini tuzatib qayta urinishi uchun), shuning uchun o'zbekcha va aniq.

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

const ID_RE = /^[A-Za-z0-9_-]{8,40}$/;

export interface InputReader {
  id(key: string): string;
  optId(key: string): string | undefined;
  int(key: string, opts: { min: number; max: number; def: number }): number;
  str(key: string, opts?: { max?: number; min?: number }): string;
  bool(key: string): boolean;
  /** YYYY-MM-DD (shu kun oxirigacha, Toshkent vaqti) yoki to'liq ISO sana. Kelajakda bo'lishi shart. */
  futureDate(key: string, now?: Date): { iso: string; label: string } | undefined;
  optStr(key: string, opts?: { max?: number }): string | undefined;
  oneOf<T extends string>(key: string, values: readonly T[]): T | undefined;
}

export function reader(raw: unknown): InputReader {
  const obj: Record<string, unknown> =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const has = (k: string) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '';

  const readStr = (key: string, max: number, min = 1): string => {
    const v = obj[key];
    if (typeof v !== 'string') throw new ToolInputError(`"${key}" matn bo'lishi kerak`);
    const t = v.trim();
    if (!t) throw new ToolInputError(`"${key}" bo'sh bo'lmasligi kerak`);
    if (t.length < min) throw new ToolInputError(`"${key}" juda qisqa (kamida ${min} belgi)`);
    if (t.length > max) throw new ToolInputError(`"${key}" juda uzun (eng ko'pi ${max} belgi)`);
    return t;
  };

  const readId = (key: string): string => {
    const v = readStr(key, 40);
    if (!ID_RE.test(v)) {
      throw new ToolInputError(`"${key}" noto'g'ri identifikator. Avval ro'yxat tool'i bilan haqiqiy id ni oling; id ni o'zingdan to'qima`);
    }
    return v;
  };

  return {
    id: (key) => {
      if (!has(key)) throw new ToolInputError(`"${key}" majburiy`);
      return readId(key);
    },
    optId: (key) => (has(key) ? readId(key) : undefined),
    int: (key, { min, max, def }) => {
      if (!has(key)) return def;
      const n = typeof obj[key] === 'string' ? Number(obj[key]) : obj[key];
      if (typeof n !== 'number' || !Number.isInteger(n)) throw new ToolInputError(`"${key}" butun son bo'lishi kerak`);
      if (n < min || n > max) throw new ToolInputError(`"${key}" ${min}..${max} oralig'ida bo'lishi kerak`);
      return n;
    },
    str: (key, opts) => {
      if (!has(key)) throw new ToolInputError(`"${key}" majburiy`);
      return readStr(key, opts?.max ?? 200, opts?.min ?? 1);
    },
    bool: (key) => {
      if (typeof obj[key] !== 'boolean') throw new ToolInputError(`"${key}" true yoki false bo'lishi kerak`);
      return obj[key] as boolean;
    },
    futureDate: (key, now = new Date()) => {
      if (!has(key)) return undefined;
      const raw = readStr(key, 40);
      let d: Date;
      let label: string;
      const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (dayOnly) {
        const [, y, m, day] = dayOnly.map(Number) as unknown as number[];
        // shu kunning oxiri (23:59) Toshkent vaqti (UTC+5) bilan
        d = new Date(Date.UTC(y, m - 1, day, 23, 59, 0) - 5 * 3_600_000);
        label = `${raw} (kun oxirigacha)`;
        if (new Date(Date.UTC(y, m - 1, day)).getUTCDate() !== day) throw new ToolInputError(`"${key}" mavjud bo'lmagan sana`);
      } else {
        d = new Date(raw);
        if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || Number.isNaN(d.getTime())) throw new ToolInputError(`"${key}" YYYY-MM-DD formatida bo'lishi kerak`);
        label = raw;
      }
      if (d.getTime() <= now.getTime()) throw new ToolInputError(`"${key}" kelajakdagi sana bo'lishi kerak`);
      return { iso: d.toISOString(), label };
    },
    optStr: (key, opts) => (has(key) ? readStr(key, opts?.max ?? 200) : undefined),
    oneOf: (key, values) => {
      if (!has(key)) return undefined;
      const v = obj[key];
      if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) {
        throw new ToolInputError(`"${key}" quyidagilardan biri bo'lishi kerak: ${values.join(', ')}`);
      }
      return v as (typeof values)[number];
    },
  };
}

/** Uzun ro'yxatni kesadi va kesilganini modelga aytadi (u foydalanuvchiga to'liq emasligini bilsin). */
export function capList<T>(items: T[], max: number): { items: T[]; total: number; truncated: boolean } {
  return { items: items.slice(0, max), total: items.length, truncated: items.length > max };
}

export const cut = (s: string | null | undefined, max: number): string => {
  const t = (s ?? '').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};
