import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto, LEAD_STATUSES, UpdateLeadDto } from './dto/leads.dto';

/** Qabul (lid) CRM — har bir so'rov faqat admin maktabi bilan cheklanadi. */
@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgOf(user: CurrentUserPayload): string {
    if (user.role !== 'ADMIN' || !user.organizationId) throw new ForbiddenException('Qabul bo\'limi faqat maktab administratori uchun');
    return user.organizationId;
  }

  async list(user: CurrentUserPayload, status?: string) {
    const organizationId = this.orgOf(user);
    const where: any = { organizationId };
    if (status && (LEAD_STATUSES as readonly string[]).includes(status)) where.status = status;
    const [items, grouped] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: [{ nextContactAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }], take: 300 }),
      this.prisma.lead.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
    for (const g of grouped) counts[g.status] = g._count._all;
    return { items, counts };
  }

  create(user: CurrentUserPayload, dto: CreateLeadDto) {
    const organizationId = this.orgOf(user);
    return this.prisma.lead.create({
      data: {
        organizationId, createdById: user.id, name: dto.name.trim(), phone: dto.phone?.trim() || null, source: dto.source?.trim() || null,
        interest: dto.interest?.trim() || null, note: dto.note?.trim() || null, nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : null,
      },
    });
  }

  private async own(user: CurrentUserPayload, id: string) {
    const organizationId = this.orgOf(user);
    const lead = await this.prisma.lead.findUnique({ where: { id }, select: { id: true, organizationId: true } });
    // Boshqa maktab arizasi — mavjud emasdek
    if (!lead || lead.organizationId !== organizationId) throw new NotFoundException('Ariza topilmadi');
    return lead;
  }

  async update(user: CurrentUserPayload, id: string, dto: UpdateLeadDto) {
    await this.own(user, id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.source !== undefined) data.source = dto.source.trim() || null;
    if (dto.interest !== undefined) data.interest = dto.interest.trim() || null;
    if (dto.note !== undefined) data.note = dto.note.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.nextContactAt !== undefined) data.nextContactAt = dto.nextContactAt ? new Date(dto.nextContactAt) : null;
    return this.prisma.lead.update({ where: { id }, data });
  }

  async remove(user: CurrentUserPayload, id: string) {
    await this.own(user, id);
    await this.prisma.lead.delete({ where: { id } });
    return { ok: true };
  }
}
