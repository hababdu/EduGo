import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationCoreService {
  constructor(private readonly prisma: PrismaService) {}

  listTypes() {
    return this.prisma.organizationType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      select: { id: true, slug: true, nameUz: true, nameRu: true, nameEn: true, description: true },
    });
  }

  listDirections(category?: string) {
    const normalized = category?.trim();
    return this.prisma.educationDirection.findMany({
      where: { isActive: true, ...(normalized ? { category: normalized } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      select: { id: true, slug: true, nameUz: true, nameRu: true, nameEn: true, category: true, description: true },
    });
  }

  async classifyOrganization(organizationId: string, typeId: string, directionIds: string[]) {
    if (!organizationId || !typeId) throw new BadRequestException('Tashkilot va turi ko‘rsatilishi shart');
    const uniqueDirectionIds = [...new Set(directionIds)];
    const [organization, type, directions] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      this.prisma.organizationType.findFirst({ where: { id: typeId, isActive: true }, select: { id: true } }),
      this.prisma.educationDirection.findMany({ where: { id: { in: uniqueDirectionIds }, isActive: true }, select: { id: true } }),
    ]);
    if (!organization) throw new NotFoundException('Tashkilot topilmadi');
    if (!type) throw new BadRequestException('Tashkilot turi topilmadi yoki faol emas');
    if (directions.length !== uniqueDirectionIds.length) throw new BadRequestException('Yo‘nalishlardan biri topilmadi yoki faol emas');

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: organizationId }, data: { typeId } });
      await tx.organizationDirection.deleteMany({ where: { organizationId } });
      if (uniqueDirectionIds.length) {
        await tx.organizationDirection.createMany({
          data: uniqueDirectionIds.map((directionId) => ({ organizationId, directionId })),
        });
      }
    });

    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true, name: true, type: { select: { id: true, slug: true, nameUz: true } },
        directions: { include: { direction: { select: { id: true, slug: true, nameUz: true } } } },
      },
    });
  }
}
