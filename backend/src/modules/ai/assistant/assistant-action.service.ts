// src/modules/ai/assistant/assistant-action.service.ts
//
// Yozuvchi amallar hayot sikli:  taklif (PENDING) -> tasdiq (CONFIRMED) -> bajarildi (EXECUTED | FAILED)
//                                                 \-> bekor (CANCELLED) | muddat tugadi (EXPIRED)
//
// Xavfsizlik kafolatlari:
//  * Model amalni BAJARA OLMAYDI — faqat taklif yaratadi. Bajarish faqat shu servisning confirm() metodi orqali.
//  * Kartochka matnini tool.prepare() SERVERda quradi; model matni kartochkaga o'tmaydi.
//  * Tasdiq ATOMIK: `updateMany WHERE status='PENDING' AND expiresAt>now` — ikki marta bosish yoki poyga bo'lsa ham
//    amal bir martadan ortiq bajarilmaydi.
//  * Faqat taklifni yaratgan foydalanuvchi tasdiqlay/bekor qila oladi (boshqasi uchun "topilmadi").
//  * Har bir natija (EXECUTED/FAILED) audit jurnaliga yoziladi; mavjud servis o'zining audit yozuvini ham yuritadi.
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../admin/audit/audit.service';
import { ActionCard, AssistantWriteTool } from './assistant.types';
import { AssistantToolRegistry } from './assistant-tool.registry';
import { ToolInputError } from './tool-input';

export const ACTION_TTL_MS = 10 * 60_000;
export const MAX_PENDING_PER_USER = 5;

const ID_RE = /^[A-Za-z0-9_-]{8,40}$/;

type ActionStatus = 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export type ProposeOutcome = { ok: boolean; content: string; card?: ActionCard };

/** Kalitlari tartiblangan JSON: bir xil kirish doim bir xil hash beradi. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

const STATUS_LABEL: Record<ActionStatus, string> = {
  PENDING: 'tasdiq kutmoqda',
  CONFIRMED: 'bajarilmoqda',
  EXECUTED: 'bajarilgan',
  FAILED: 'bajarilmagan (xato bilan tugagan)',
  CANCELLED: 'bekor qilingan',
  EXPIRED: 'muddati tugagan',
};

@Injectable()
export class AssistantActionService {
  private readonly logger = new Logger(AssistantActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssistantToolRegistry,
    private readonly audit: AuditService,
  ) {}

  private assertId(id: string) {
    if (!ID_RE.test(id)) throw new BadRequestException("Amal identifikatori noto'g'ri");
  }

  private card(row: { id: string; tool: string; summary: string; details: unknown; risk: string; expiresAt: Date }): ActionCard {
    return {
      id: row.id,
      tool: row.tool,
      summary: row.summary,
      details: row.details as ActionCard['details'],
      risk: row.risk as ActionCard['risk'],
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  /* ───────────── TAKLIF (model chaqiradi; hech narsa bajarilmaydi) ───────────── */

  async propose(user: CurrentUserPayload, tool: AssistantWriteTool, rawInput: unknown, now: Date = new Date()): Promise<ProposeOutcome> {
    const fail = (error: string): ProposeOutcome => ({ ok: false, content: JSON.stringify({ error }) });

    let input: unknown;
    let preview: { summary: string; details: { label: string; value: string }[] };
    try {
      input = tool.parse(rawInput);
      preview = await tool.prepare(user, input);
    } catch (e) {
      if (e instanceof ToolInputError) return fail(e.message);
      if (e instanceof HttpException) {
        const body = e.getResponse();
        const msg = typeof body === 'string' ? body : ((body as any)?.message ?? e.message);
        return fail(Array.isArray(msg) ? msg[0] : msg);
      }
      this.logger.error(`Amal tayyorlashda xato (${tool.name}): ${(e as Error)?.message}`);
      return fail("Amalni tayyorlashda xatolik yuz berdi");
    }

    const fingerprint = createHash('sha256').update(`${tool.name}:${canonicalJson(input)}`).digest('hex');

    // Aynan shu amal allaqachon tasdiq kutayotgan bo'lsa — qayta yaratmaymiz (model takrorlab yuborishi mumkin)
    const existing = await this.prisma.assistantAction.findFirst({
      where: { userId: user.id, fingerprint, status: 'PENDING', expiresAt: { gt: now } },
    });
    if (existing) {
      return {
        ok: true,
        card: this.card(existing),
        content: JSON.stringify({ status: 'PENDING_CONFIRMATION', actionId: existing.id, note: 'Bu amal allaqachon tasdiq kutmoqda. Amal HALI BAJARILMAGAN.' }),
      };
    }

    const pending = await this.prisma.assistantAction.count({ where: { userId: user.id, status: 'PENDING', expiresAt: { gt: now } } });
    if (pending >= MAX_PENDING_PER_USER) {
      return fail(`Tasdiqlanmagan amallar ko'p (${MAX_PENDING_PER_USER} ta). Avval ularni tasdiqlang yoki bekor qiling`);
    }

    const row = await this.prisma.assistantAction.create({
      data: {
        userId: user.id,
        tool: tool.name,
        input: input as Prisma.InputJsonValue,
        fingerprint,
        summary: preview.summary,
        details: preview.details as unknown as Prisma.InputJsonValue,
        risk: tool.risk,
        expiresAt: new Date(now.getTime() + ACTION_TTL_MS),
      },
    });

    return {
      ok: true,
      card: this.card(row),
      content: JSON.stringify({
        status: 'PENDING_CONFIRMATION',
        actionId: row.id,
        note:
          "Amal HALI BAJARILMAGAN. Foydalanuvchiga tasdiqlash kartochkasi ko'rsatildi; u 'Tasdiqlash' tugmasini bosganda bajariladi. " +
          "'Bajarildi' dema — faqat nima tasdiq kutayotganini qisqa ayt.",
      }),
    };
  }

  /* ───────────── TASDIQLASH (foydalanuvchi tugmani bosadi) ───────────── */

  async confirm(user: CurrentUserPayload, id: string, now: Date = new Date()) {
    this.assertId(id);

    // Boshqa foydalanuvchining amali mavjudligini ham oshkor qilmaymiz
    const row = await this.prisma.assistantAction.findFirst({ where: { id, userId: user.id } });
    if (!row) throw new NotFoundException('Amal topilmadi');

    // ATOMIK "egallash": faqat bitta so'rov PENDING -> CONFIRMED o'tkaza oladi
    const claim = await this.prisma.assistantAction.updateMany({
      where: { id, userId: user.id, status: 'PENDING', expiresAt: { gt: now } },
      data: { status: 'CONFIRMED' },
    });
    if (claim.count === 0) {
      const current = await this.prisma.assistantAction.findFirst({ where: { id, userId: user.id } });
      if (current?.status === 'PENDING') {
        await this.prisma.assistantAction.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'EXPIRED', resolvedAt: now } });
        throw new GoneException('Tasdiqlash muddati tugagan. Amalni qaytadan so\'rang');
      }
      throw new ConflictException(`Bu amal allaqachon ${STATUS_LABEL[(current?.status ?? 'EXPIRED') as ActionStatus]}`);
    }

    const finish = async (status: 'EXECUTED' | 'FAILED', extra: { error?: string; result?: unknown } = {}) => {
      await this.prisma.assistantAction.update({ where: { id }, data: { status, error: extra.error ?? null, resolvedAt: new Date() } });
      await this.auditSafe(user, row, status, extra);
    };

    // Rol tasdiq vaqtida ham tekshiriladi (rol o'zgargan yoki tool olib tashlangan bo'lishi mumkin)
    const tool = this.registry.writeToolByName(user, row.tool);
    if (!tool) {
      await finish('FAILED', { error: "Bu amalga endi ruxsatingiz yo'q" });
      throw new ForbiddenException("Bu amalga endi ruxsatingiz yo'q");
    }

    let input: unknown;
    try {
      input = tool.parse(row.input);
    } catch (e) {
      await finish('FAILED', { error: 'Saqlangan kirish yaroqsiz' });
      throw new BadRequestException('Amal ma\'lumotlari yaroqsiz');
    }

    try {
      const result = await tool.execute(user, input);
      await finish('EXECUTED', { result });
      return { id, status: 'EXECUTED' as const, message: `Bajarildi: ${row.summary}` };
    } catch (e) {
      const msg = e instanceof HttpException ? this.httpMessage(e) : 'Amalni bajarishda xatolik yuz berdi';
      await finish('FAILED', { error: msg });
      if (e instanceof HttpException) throw e; // servisning o'zbekcha 403/404/400 xabari foydalanuvchiga boradi
      this.logger.error(`Amal bajarilmadi (${row.tool}, ${id}): ${(e as Error)?.message}`);
      throw new InternalServerErrorException(msg);
    }
  }

  /* ───────────── BEKOR QILISH ───────────── */

  async cancel(user: CurrentUserPayload, id: string, now: Date = new Date()) {
    this.assertId(id);
    const res = await this.prisma.assistantAction.updateMany({
      where: { id, userId: user.id, status: 'PENDING' },
      data: { status: 'CANCELLED', resolvedAt: now },
    });
    if (res.count === 1) return { id, status: 'CANCELLED' as const };

    const current = await this.prisma.assistantAction.findFirst({ where: { id, userId: user.id } });
    if (!current) throw new NotFoundException('Amal topilmadi');
    if (current.status === 'CANCELLED') return { id, status: 'CANCELLED' as const }; // takroriy bekor — xato emas
    throw new ConflictException(`Bu amal allaqachon ${STATUS_LABEL[current.status as ActionStatus]}`);
  }

  /** Sahifa yangilangandan keyin kartochkalarni tiklash uchun. */
  async listPending(user: CurrentUserPayload, now: Date = new Date()): Promise<ActionCard[]> {
    const rows = await this.prisma.assistantAction.findMany({
      where: { userId: user.id, status: 'PENDING', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      take: MAX_PENDING_PER_USER,
    });
    return rows.map((r) => this.card(r));
  }

  /* ───────────── yordamchilar ───────────── */

  private httpMessage(e: HttpException): string {
    const body = e.getResponse();
    const msg = typeof body === 'string' ? body : ((body as any)?.message ?? e.message);
    return Array.isArray(msg) ? msg[0] : msg;
  }

  /** Audit xatosi foydalanuvchi natijasini buzmasligi kerak (mavjud servis o'z yozuvini allaqachon yuritgan). */
  private async auditSafe(
    user: CurrentUserPayload,
    row: { id: string; tool: string; input: unknown; summary: string },
    outcome: 'EXECUTED' | 'FAILED',
    extra: { error?: string },
  ) {
    try {
      await this.audit.log({
        actorId: user.id,
        action: 'ASSISTANT_ACTION',
        targetType: 'AssistantAction',
        targetId: row.id,
        newValue: { via: 'assistant', tool: row.tool, input: row.input, summary: row.summary, outcome, ...(extra.error ? { error: extra.error } : {}) },
      });
    } catch (e) {
      this.logger.error(`ASSISTANT_ACTION audit yozilmadi (${row.id}): ${(e as Error)?.message}`);
    }
  }
}
