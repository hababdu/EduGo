import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export function signPayload(raw: Buffer | string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('hex');
}

@Injectable()
export class OrgInvoiceService {
  constructor(private readonly prisma: PrismaService, private readonly cfg: ConfigService) {}

  /** Super admin: maktab uchun oylik hisob (summa — maktabning oylik tarifi). */
  async create(actor: CurrentUserPayload, orgId: string, month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException("Oy YYYY-MM ko'rinishida bo'lsin");
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, monthlyPlanFee: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    if (!org.monthlyPlanFee || org.monthlyPlanFee <= 0) throw new BadRequestException('Avval maktabning oylik tarifini belgilang');
    const dup = await this.prisma.orgInvoice.findFirst({ where: { organizationId: orgId, month, status: { in: ['PENDING', 'PAID'] } }, select: { id: true } });
    if (dup) throw new ConflictException("Bu oy uchun hisob allaqachon bor");
    return this.prisma.orgInvoice.create({ data: { organizationId: orgId, month, amount: org.monthlyPlanFee, createdById: actor.id }, select: { id: true, month: true, amount: true, status: true } });
  }

  list(orgId: string) {
    return this.prisma.orgInvoice.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 24, select: { id: true, month: true, amount: true, status: true, provider: true, paidAt: true } });
  }

  async cancel(orgId: string, id: string) {
    const r = await this.prisma.orgInvoice.updateMany({ where: { id, organizationId: orgId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (!r.count) throw new NotFoundException('Kutilayotgan hisob topilmadi');
    return { ok: true };
  }

  /** To'lov provayderi webhook'i: HMAC-SHA256 imzo, summa tekshiruvi, idempotent. */
  async webhook(provider: string, raw: Buffer | undefined, signature: string | undefined, body: { invoiceId?: string; externalId?: string; status?: string; amount?: number }) {
    const secret = this.cfg.get<string>('BILLING_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException("To'lov webhook sozlanmagan");
    if (!raw || !signature) throw new UnauthorizedException('Imzo yo\'q');
    const expected = Buffer.from(signPayload(raw, secret), 'hex');
    let given: Buffer;
    try { given = Buffer.from(signature.trim(), 'hex'); } catch { throw new UnauthorizedException('Imzo noto\'g\'ri'); }
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new UnauthorizedException("Imzo noto'g'ri");

    if (body.status !== 'paid') return { ok: true, ignored: true };
    const invoice = body.invoiceId ? await this.prisma.orgInvoice.findUnique({ where: { id: body.invoiceId } }) : null;
    if (!invoice) throw new NotFoundException('Hisob topilmadi');
    if (invoice.status === 'PAID') return { ok: true, duplicate: true };
    if (invoice.status === 'CANCELLED') throw new ConflictException('Hisob bekor qilingan');
    if (body.amount !== invoice.amount) throw new BadRequestException("Summa mos kelmadi");

    await this.prisma.$transaction([
      this.prisma.orgInvoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date(), provider: provider.slice(0, 30), externalId: body.externalId ? String(body.externalId).slice(0, 100) : null } }),
      this.prisma.orgPayment.upsert({
        where: { organizationId_month: { organizationId: invoice.organizationId, month: invoice.month } },
        create: { organizationId: invoice.organizationId, month: invoice.month, status: 'PAID', amount: invoice.amount, note: `Online: ${provider}`, markedById: invoice.createdById },
        update: { status: 'PAID', amount: invoice.amount, note: `Online: ${provider}`, paidAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
