import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestToJoin(userId: string, organizationId: string, role: OrganizationRole) {
    if (role !== OrganizationRole.STUDENT) throw new ForbiddenException('O‘qituvchi va administrator rollari faqat tayinlash orqali beriladi');
    const [user, organization] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true, deletedAt: true } }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, status: true } }),
    ]);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') throw new ForbiddenException('Akkaunt faol emas');
    if (!organization || organization.status !== 'ACTIVE') throw new NotFoundException('Faol maktab topilmadi');

    const existing = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId_role: { userId, organizationId, role } },
    });
    if (existing?.status === MembershipStatus.ACTIVE) throw new ConflictException("Siz ushbu maktab a'zosisiz");
    if (existing && (existing.status === MembershipStatus.REQUESTED || existing.status === MembershipStatus.INVITED)) {
      throw new ConflictException('A’zolik so‘rovingiz allaqachon mavjud');
    }

    return this.prisma.organizationMembership.upsert({
      where: { userId_organizationId_role: { userId, organizationId, role } },
      create: { userId, organizationId, role, status: MembershipStatus.REQUESTED },
      update: { status: MembershipStatus.REQUESTED, leftAt: null, invitedById: null, approvedById: null },
    });
  }

  private async assertGlobalSuperAdmin(actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true, status: true, deletedAt: true } });
    if (!actor || actor.role !== 'SUPER_ADMIN' || actor.status !== 'ACTIVE' || actor.deletedAt) {
      throw new ForbiddenException('Faqat Super Admin ushbu amalni bajarishi mumkin');
    }
  }

  private async assertActiveSchoolAdmin(actorId: string, organizationId: string) {
    const admin = await this.prisma.organizationMembership.findFirst({
      where: { userId: actorId, organizationId, role: OrganizationRole.ADMIN, status: MembershipStatus.ACTIVE, organization: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!admin) throw new ForbiddenException('Bu maktabda faol administrator huquqi talab qilinadi');
  }

  async appointSchoolAdmin(actorId: string, organizationId: string, targetUserId: string) {
    await this.assertGlobalSuperAdmin(actorId);
    return this.assign(organizationId, targetUserId, OrganizationRole.ADMIN, actorId);
  }

  async appointTeacher(actorId: string, organizationId: string, targetUserId: string) {
    await this.assertActiveSchoolAdmin(actorId, organizationId);
    return this.assign(organizationId, targetUserId, OrganizationRole.TEACHER, actorId);
  }

  async approveRequest(actorId: string, membershipId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFoundException('A’zolik so‘rovi topilmadi');
    await this.assertActiveSchoolAdmin(actorId, membership.organizationId);
    if (membership.role !== OrganizationRole.STUDENT) throw new ForbiddenException('Faqat o‘quvchi so‘rovini tasdiqlash mumkin');
    if (membership.status !== MembershipStatus.REQUESTED) throw new ConflictException('So‘rov REQUESTED holatida emas');
    return this.prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.ACTIVE, approvedById: actorId, joinedAt: new Date(), leftAt: null },
    });
  }

  private async assign(organizationId: string, targetUserId: string, role: OrganizationRole, actorId: string) {
    const [org, target] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, status: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, status: true, deletedAt: true } }),
    ]);
    if (!org || org.status !== 'ACTIVE') throw new NotFoundException('Faol maktab topilmadi');
    if (!target || target.status !== 'ACTIVE' || target.deletedAt) throw new NotFoundException('Faol foydalanuvchi topilmadi');
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId_role: { userId: targetUserId, organizationId, role } },
    });
    if (existing?.status === MembershipStatus.ACTIVE) throw new ConflictException('Bu rol allaqachon tayinlangan');
    return this.prisma.organizationMembership.upsert({
      where: { userId_organizationId_role: { userId: targetUserId, organizationId, role } },
      create: { userId: targetUserId, organizationId, role, status: MembershipStatus.ACTIVE, invitedById: actorId, approvedById: actorId, joinedAt: new Date() },
      update: { status: MembershipStatus.ACTIVE, invitedById: actorId, approvedById: actorId, joinedAt: new Date(), leftAt: null },
    });
  }
}
