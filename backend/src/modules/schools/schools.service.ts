import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolQueryDto } from './dto/school-query.dto';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: SchoolQueryDto) {
    const where: Prisma.OrganizationWhereInput = {
      status: 'ACTIVE', publiclyListed: true,
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: [{ name: 'asc' }],
        select: { id: true, slug: true, name: true, description: true, city: true, address: true, phone: true, websiteUrl: true, logoUrl: true, coverImageUrl: true, educationLevels: true, createdAt: true },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
  }

  async getPublic(slugOrId: string) {
    const school = await this.prisma.organization.findFirst({
      where: { status: 'ACTIVE', publiclyListed: true, OR: [{ slug: slugOrId }, { id: slugOrId }] },
      select: { id: true, slug: true, name: true, description: true, city: true, address: true, phone: true, websiteUrl: true, logoUrl: true, coverImageUrl: true, educationLevels: true, createdAt: true },
    });
    if (!school) throw new NotFoundException('Maktab topilmadi');
    return school;
  }

  async create(actorId: string, dto: CreateSchoolDto) {
    await this.assertSuperAdmin(actorId);
    const base = this.slugify(dto.name);
    const slug = base ? `${base}-${Math.random().toString(36).slice(2, 8)}` : undefined;
    return this.prisma.organization.create({
      data: { ...dto, slug, publiclyListed: false },
      select: { id: true, name: true, slug: true, publiclyListed: true, createdAt: true },
    });
  }

  async publish(actorId: string, organizationId: string, publiclyListed: boolean) {
    await this.assertSuperAdmin(actorId);
    const school = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!school) throw new NotFoundException('Maktab topilmadi');
    return this.prisma.organization.update({ where: { id: organizationId }, data: { publiclyListed }, select: { id: true, name: true, publiclyListed: true } });
  }

  private async assertSuperAdmin(actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true, status: true, deletedAt: true } });
    if (!actor || actor.role !== 'SUPER_ADMIN' || actor.status !== 'ACTIVE' || actor.deletedAt) {
      throw new ForbiddenException('Faqat faol Super Admin maktab yaratishi yoki katalogda nashr qilishi mumkin');
    }
  }

  private slugify(value: string) {
    return value.normalize('NFKD').toLowerCase().replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }
}
