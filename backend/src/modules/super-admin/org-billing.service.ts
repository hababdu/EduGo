import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { currentMonth, parseMonth } from '../groups/payments.service';
import { MarkOrgPaymentDto } from './dto/super-admin.dto';

export type SubState = 'PAID' | 'WAIVED' | 'UNPAID';

/**
 * Maktab obunasi: har bir MAKTAB (admin emas) super adminga oylik to'lov qiladi.
 * Bu o'quvchilarning guruh to'lovlaridan (`Payment`) butunlay alohida.
 */
@Injectable()
export class OrgBillingService {
  constructor(private readonly prisma: PrismaService) {}

  private audit(actor: CurrentUserPayload, action: string, id: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.adminActionLog
      .create({ data: { actorId: actor.id, action, targetType: 'OrgPayment', targetId: id, oldValue: oldValue as any, newValue: newValue as any } })
      .catch(() => undefined);
  }

  /** Barcha maktablar: tanlangan oy bo'yicha obuna holati + jamlama. */
  async overview(monthInput?: string) {
    const month = parseMonth(monthInput ?? currentMonth());
    const [orgs, pays] = await Promise.all([
      this.prisma.organization.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, status: true, monthlyPlanFee: true } }),
      this.prisma.orgPayment.findMany({ where: { month }, select: { organizationId: true, status: true, amount: true, note: true, paidAt: true } }),
    ]);
    const by = new Map(pays.map((p) => [p.organizationId, p]));
    const items = orgs.map((o) => {
      const p = by.get(o.id);
      return {
        orgId: o.id, name: o.name, orgStatus: o.status, fee: o.monthlyPlanFee,
        state: (p?.status ?? 'UNPAID') as SubState, amount: p?.amount ?? 0, note: p?.note ?? null, paidAt: p?.paidAt ?? null,
      };
    });
    const active = items.filter((i) => i.orgStatus === 'ACTIVE');
    return {
      month, items,
      totals: {
        paid: items.filter((i) => i.state === 'PAID').length,
        waived: items.filter((i) => i.state === 'WAIVED').length,
        unpaid: active.filter((i) => i.state === 'UNPAID').length,
        collected: items.reduce((a, i) => a + (i.state === 'PAID' ? i.amount : 0), 0),
        expected: active.filter((i) => i.state !== 'WAIVED').reduce((a, i) => a + (i.fee ?? 0), 0),
      },
    };
  }

  /** Bitta maktabning oxirgi 12 oylik tarixi. */
  async history(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, monthlyPlanFee: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    return this.historyOf(org);
  }

  private async historyOf(org: { id: string; name: string; monthlyPlanFee: number | null }) {
    const rows = await this.prisma.orgPayment.findMany({ where: { organizationId: org.id }, orderBy: { month: 'desc' }, take: 12 });
    return {
      orgId: org.id, name: org.name, fee: org.monthlyPlanFee, currentMonth: currentMonth(),
      payments: rows.map((r) => ({ month: r.month, state: r.status as SubState, amount: r.amount, note: r.note, paidAt: r.paidAt })),
    };
  }

  /** ADMIN: faqat o'z maktabining obuna holati (ko'rish uchun; belgilash — faqat super admin). */
  async mine(user: CurrentUserPayload) {
    if (!user.organizationId) throw new NotFoundException('Siz hech qaysi maktabga biriktirilmagansiz');
    const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId }, select: { id: true, name: true, monthlyPlanFee: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const h = await this.historyOf(org);
    const cur = h.payments.find((p) => p.month === h.currentMonth);
    return { ...h, state: (cur?.state ?? 'UNPAID') as SubState };
  }

  async mark(actor: CurrentUserPayload, orgId: string, dto: MarkOrgPaymentDto) {
    const month = parseMonth(dto.month);
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, monthlyPlanFee: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const old = await this.prisma.orgPayment.findUnique({ where: { organizationId_month: { organizationId: orgId, month } } });

    if (dto.status === 'UNPAID') {
      await this.prisma.orgPayment.deleteMany({ where: { organizationId: orgId, month } });
      await this.audit(actor, 'ORG_PAYMENT_CLEAR', orgId, old && { month, status: old.status, amount: old.amount }, { month, status: 'UNPAID' });
      return { month, state: 'UNPAID' as SubState, amount: 0 };
    }
    const amount = dto.status === 'WAIVED' ? 0 : dto.amount ?? org.monthlyPlanFee ?? 0;
    if (dto.status === 'PAID' && amount <= 0) throw new BadRequestException("To'lov summasini kiriting yoki maktab uchun oylik summani belgilang");
    const data = { status: dto.status, amount, note: dto.note?.trim() || null, paidAt: new Date(), markedById: actor.id };
    await this.prisma.orgPayment.upsert({
      where: { organizationId_month: { organizationId: orgId, month } },
      create: { organizationId: orgId, month, ...data },
      update: data,
    });
    await this.audit(actor, 'ORG_PAYMENT', orgId, old && { month, status: old.status, amount: old.amount }, { month, status: dto.status, amount });
    return { month, state: dto.status as SubState, amount };
  }
}
