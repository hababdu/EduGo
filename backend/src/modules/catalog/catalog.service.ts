import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { resolveOrgId } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';

const PAGE = 20;
const PUBLIC_SEL = { id: true, name: true, city: true, about: true, ratingAvg: true, ratingCount: true } as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ochiq katalog: faqat faol va ochiq maktablar, faqat ommaviy maydonlar. Reyting denormalizatsiya qilingan (tez saralash). */
  async list(q: { search?: string; city?: string; minRating?: string; sort?: string; page?: string }) {
    const s = q.search?.trim();
    const min = Math.min(5, Math.max(0, Number(q.minRating) || 0));
    const where: any = {
      status: 'ACTIVE', isPublic: true,
      ...(q.city?.trim() ? { city: { equals: q.city.trim(), mode: 'insensitive' } } : {}),
      ...(min ? { ratingAvg: { gte: min } } : {}),
      ...(s ? { OR: [{ name: { contains: s, mode: 'insensitive' } }, { about: { contains: s, mode: 'insensitive' } }] } : {}),
    };
    const orderBy: any = q.sort === 'name' ? [{ name: 'asc' }] : q.sort === 'newest' ? [{ createdAt: 'desc' }] : [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { name: 'asc' }];
    const page = Math.max(1, Number(q.page) || 1);
    const [total, items] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({ where, orderBy, skip: (page - 1) * PAGE, take: PAGE, select: PUBLIC_SEL }),
    ]);
    return { total, page, pages: Math.max(1, Math.ceil(total / PAGE)), items };
  }

  async cities() {
    const rows = await this.prisma.organization.groupBy({ by: ['city'], where: { status: 'ACTIVE', isPublic: true, city: { not: null } }, _count: true, orderBy: { city: 'asc' } });
    return rows.map((r) => ({ city: r.city, schools: r._count }));
  }

  async detail(id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, status: 'ACTIVE', isPublic: true }, select: { ...PUBLIC_SEL, subjects: { select: { name: true }, orderBy: { name: 'asc' }, take: 50 } } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const [dist, reviews] = await Promise.all([
      this.prisma.schoolReview.groupBy({ by: ['rating'], where: { organizationId: id }, _count: true }),
      this.prisma.schoolReview.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 10, select: { rating: true, comment: true, createdAt: true, user: { select: { firstName: true } } } }),
    ]);
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) breakdown[d.rating] = d._count;
    return { ...org, subjects: org.subjects.map((x) => x.name), breakdown, reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.createdAt, author: r.user.firstName })) };
  }

  /** Sharh qoldirish: faqat maktabning faol yoki sobiq a'zosi; bitta foydalanuvchi — bitta sharh (yangilanadi). */
  async review(user: CurrentUserPayload, orgId: string, rating: number, comment?: string) {
    const m = await this.prisma.organizationMembership.findFirst({ where: { userId: user.id, organizationId: orgId, status: { in: ['ACTIVE', 'REMOVED'] } }, select: { id: true } });
    if (!m) throw new ForbiddenException("Sharh faqat shu maktab a'zolari uchun");
    const c = comment?.trim() || null;
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolReview.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: orgId } }, create: { userId: user.id, organizationId: orgId, rating, comment: c }, update: { rating, comment: c } });
      const agg = await tx.schoolReview.aggregate({ where: { organizationId: orgId }, _avg: { rating: true }, _count: true });
      await tx.organization.update({ where: { id: orgId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
    });
    return { ok: true };
  }

  async updateProfile(actor: CurrentUserPayload, dto: { city?: string; about?: string; isPublic?: boolean; organizationId?: string }) {
    const id = resolveOrgId(actor, dto.organizationId);
    await this.prisma.organization.update({ where: { id }, data: { ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}), ...(dto.about !== undefined ? { about: dto.about.trim() || null } : {}), ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}) } });
    return { ok: true };
  }
}
