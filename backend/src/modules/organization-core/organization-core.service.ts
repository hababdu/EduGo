import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class OrganizationCoreService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes() {
    return this.prisma.organizationType.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      select: { id: true, slug: true, nameUz: true, nameRu: true, nameEn: true, description: true },
    });
  }

  listTypesAdmin() {
    return this.prisma.organizationType.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }] });
  }

  listDirectionsAdmin() {
    return this.prisma.educationDirection.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }] });
  }

  listDirections(category?: string) {
    const normalized = category?.trim();
    return this.prisma.educationDirection.findMany({
      where: { isActive: true, ...(normalized ? { category: normalized } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      select: { id: true, slug: true, nameUz: true, nameRu: true, nameEn: true, category: true, description: true },
    });
  }

  async manageCatalog(kind: 'type' | 'direction', input: { id?: string; slug: string; nameUz: string; nameRu?: string; nameEn?: string; description?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    const model = kind === 'type' ? this.prisma.organizationType : this.prisma.educationDirection;
    const data = {
      slug: input.slug.trim().toLowerCase(), nameUz: input.nameUz.trim(),
      nameRu: input.nameRu?.trim() || null, nameEn: input.nameEn?.trim() || null,
      description: input.description?.trim() || null,
      ...(kind === 'direction' ? { category: input.category?.trim() || null } : {}),
      sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true,
    };
    if (!data.slug || !data.nameUz) throw new BadRequestException('Slug va o‘zbekcha nom majburiy');
    if (input.id) {
      const current = await (model as any).findUnique({ where: { id: input.id } });
      if (!current) throw new NotFoundException('Katalog elementi topilmadi');
      return (model as any).update({ where: { id: input.id }, data });
    }
    return (model as any).create({ data });
  }

  async deleteCatalog(kind: 'type' | 'direction', id: string) {
    if (kind === 'type') {
      const used = await this.prisma.organization.count({ where: { typeId: id } });
      if (used) throw new ConflictException('Bu tur tashkilotlarga biriktirilgan. Avval boshqa turga o‘tkazing.');
      await this.prisma.organizationType.delete({ where: { id } });
    } else {
      const used = await this.prisma.organizationDirection.count({ where: { directionId: id } });
      if (used) throw new ConflictException('Bu yo‘nalish tashkilotlarda ishlatilmoqda. Avval bog‘lanishlarni olib tashlang.');
      await this.prisma.educationDirection.delete({ where: { id } });
    }
    return { ok: true };
  }

  async classifyOrganization(organizationId: string, typeId: string, directionIds: string[]) {
    if (!organizationId || !typeId) throw new BadRequestException('Tashkilot va turi ko‘rsatilishi shart');
    const ids = [...new Set(directionIds)];
    const [org, type, directions] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      this.prisma.organizationType.findFirst({ where: { id: typeId, isActive: true }, select: { id: true } }),
      this.prisma.educationDirection.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } }),
    ]);
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    if (!type) throw new BadRequestException('Tashkilot turi topilmadi yoki faol emas');
    if (directions.length !== ids.length) throw new BadRequestException('Yo‘nalishlardan biri topilmadi yoki faol emas');
    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: organizationId }, data: { typeId } });
      await tx.organizationDirection.deleteMany({ where: { organizationId } });
      if (ids.length) await tx.organizationDirection.createMany({ data: ids.map((directionId) => ({ organizationId, directionId })) });
    });
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, type: { select: { id: true, slug: true, nameUz: true } }, directions: { include: { direction: { select: { id: true, slug: true, nameUz: true } } } } },
    });
  }

  private async resolveManageableOrganization(actor: CurrentUserPayload, organizationId?: string) {
    if (actor.realRole === 'SUPER_ADMIN' || actor.role === 'SUPER_ADMIN') {
      if (!organizationId) throw new BadRequestException('organizationId majburiy');
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!org) throw new NotFoundException('Tashkilot topilmadi');
      return org.id;
    }
    if (!actor.organizationId) throw new ForbiddenException('Faol tashkilot tanlanmagan');
    if (organizationId && organizationId !== actor.organizationId) throw new ForbiddenException('Boshqa tashkilotga ruxsat yo‘q');
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId: actor.id, organizationId: actor.organizationId, status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Tashkilot administratori ruxsati talab qilinadi');
    return actor.organizationId;
  }

  async createBranch(actor: CurrentUserPayload, organizationId: string | undefined, input: { name: string; code?: string; address?: string; city?: string; phone?: string; email?: string; isMain?: boolean }) {
    const orgId = await this.resolveManageableOrganization(actor, organizationId);
    if (!input.name?.trim()) throw new BadRequestException('Filial nomi majburiy');
    return this.prisma.$transaction(async (tx) => {
      if (input.isMain) await tx.organizationBranch.updateMany({ where: { organizationId: orgId, isMain: true }, data: { isMain: false } });
      return tx.organizationBranch.create({ data: { organizationId: orgId, ...input, name: input.name.trim(), code: input.code?.trim() || null } });
    });
  }

  async updateBranch(actor: CurrentUserPayload, id: string, input: { name?: string; code?: string; address?: string; city?: string; phone?: string; email?: string; isMain?: boolean; isActive?: boolean }) {
    const branch = await this.prisma.organizationBranch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    await this.resolveManageableOrganization(actor, branch.organizationId);
    return this.prisma.$transaction(async (tx) => {
      if (input.isMain) await tx.organizationBranch.updateMany({ where: { organizationId: branch.organizationId, id: { not: id }, isMain: true }, data: { isMain: false } });
      return tx.organizationBranch.update({ where: { id }, data: { ...input, ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.code !== undefined ? { code: input.code.trim() || null } : {}) } });
    });
  }

  async deleteBranch(actor: CurrentUserPayload, id: string) {
    const branch = await this.prisma.organizationBranch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    await this.resolveManageableOrganization(actor, branch.organizationId);
    await this.prisma.organizationBranch.delete({ where: { id } });
    return { ok: true };
  }

  async listBranches(actor: CurrentUserPayload, organizationId?: string) {
    const orgId = await this.resolveManageableOrganization(actor, organizationId);
    return this.prisma.organizationBranch.findMany({ where: { organizationId: orgId }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }] });
  }

  async setActiveOrganization(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId, organizationId, status: 'ACTIVE', organization: { status: 'ACTIVE' } },
      select: { id: true, role: true, organizationId: true },
    });
    if (!membership) throw new ForbiddenException('Ushbu tashkilotda faol a’zolik topilmadi');
    await this.prisma.userActiveOrganization.upsert({
      where: { userId }, create: { userId, organizationId }, update: { organizationId },
    });
    return { ok: true, organizationId, role: membership.role };
  }
}
