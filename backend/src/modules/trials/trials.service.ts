import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, OrganizationRole, TrialLessonStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewTrialDto } from './dto/review-trial.dto';

@Injectable()
export class TrialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    return this.prisma.trialLesson.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true, city: true } }, group: { select: { id: true, name: true, lessonDays: true, lessonStartTime: true, lessonEndTime: true, room: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async request(userId: string, organizationId: string, groupId: string, scheduledAtValue: string, note?: string) {
    const scheduledAt = new Date(scheduledAtValue);
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) throw new ConflictException('Sinov darsi kelajakdagi vaqtga belgilanishi kerak');
    const [user, school, group, membership, previousTrial] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true, deletedAt: true } }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, status: true, publiclyListed: true } }),
      this.prisma.group.findUnique({ where: { id: groupId }, select: { id: true, organizationId: true, deletedAt: true, maxCapacity: true, _count: { select: { members: true, trialLessons: { where: { status: { in: [TrialLessonStatus.REQUESTED, TrialLessonStatus.APPROVED] } } } } } } }),
      this.prisma.organizationMembership.findFirst({ where: { userId, organizationId, role: OrganizationRole.STUDENT, status: MembershipStatus.ACTIVE }, select: { id: true } }),
      this.prisma.trialLesson.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { id: true } }),
    ]);
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) throw new ForbiddenException('Faol foydalanuvchi akkaunti talab qilinadi');
    if (!school || school.status !== 'ACTIVE' || !school.publiclyListed) throw new NotFoundException('Ochiq katalogdagi faol maktab topilmadi');
    if (membership) throw new ConflictException('Siz ushbu maktabning faol o‘quvchisisiz; sinov darsi talab qilinmaydi');
    if (!group || group.deletedAt || group.organizationId !== organizationId) throw new NotFoundException('Ushbu maktabga tegishli faol guruh topilmadi');
    if (previousTrial) throw new ConflictException('Ushbu maktabda sinov darsi uchun avval so‘rov yuborilgansiz');
    if (group.maxCapacity !== null && group._count.members + group._count.trialLessons >= group.maxCapacity) throw new ConflictException('Guruhda bo‘sh joy qolmagan');

    try {
      return await this.prisma.trialLesson.create({ data: { userId, organizationId, groupId, scheduledAt, note }, select: { id: true, organizationId: true, groupId: true, scheduledAt: true, status: true, note: true, createdAt: true } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Ushbu maktabda sinov darsi uchun so‘rov allaqachon mavjud');
      throw error;
    }
  }

  private async assertSchoolAdmin(actorId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({ where: { userId: actorId, organizationId, role: OrganizationRole.ADMIN, status: MembershipStatus.ACTIVE, organization: { status: 'ACTIVE' } }, select: { id: true } });
    if (!membership) throw new ForbiddenException('Ushbu maktabning faol administratori bo‘lishingiz kerak');
  }

  async review(actorId: string, trialId: string, dto: ReviewTrialDto) {
    const trial = await this.prisma.trialLesson.findUnique({ where: { id: trialId } });
    if (!trial) throw new NotFoundException('Sinov darsi topilmadi');
    await this.assertSchoolAdmin(actorId, trial.organizationId);
    if (trial.status !== TrialLessonStatus.REQUESTED) throw new ConflictException('Faqat yangi so‘rovni ko‘rib chiqish mumkin');
    return this.prisma.trialLesson.update({ where: { id: trialId }, data: { status: dto.decision === 'APPROVED' ? TrialLessonStatus.APPROVED : TrialLessonStatus.REJECTED, reviewedById: actorId, reviewedAt: new Date() } });
  }

  async markAttendance(actorId: string, trialId: string, attended: boolean) {
    const trial = await this.prisma.trialLesson.findUnique({ where: { id: trialId } });
    if (!trial) throw new NotFoundException('Sinov darsi topilmadi');
    if (trial.status !== TrialLessonStatus.APPROVED) throw new ConflictException('Davomat faqat tasdiqlangan sinov darsi uchun belgilanadi');
    const [admin, group] = await Promise.all([
      this.prisma.organizationMembership.findFirst({ where: { userId: actorId, organizationId: trial.organizationId, role: OrganizationRole.ADMIN, status: MembershipStatus.ACTIVE }, select: { id: true } }),
      this.prisma.group.findUnique({ where: { id: trial.groupId }, select: { teacherId: true } }),
    ]);
    if (!admin && group?.teacherId !== actorId) throw new ForbiddenException('Davomatni faqat shu maktab administratori yoki guruh o‘qituvchisi belgilaydi');
    return this.prisma.trialLesson.update({ where: { id: trialId }, data: { status: attended ? TrialLessonStatus.ATTENDED : TrialLessonStatus.NO_SHOW, attendedAt: attended ? new Date() : null } });
  }

  async cancel(userId: string, trialId: string) {
    const trial = await this.prisma.trialLesson.findUnique({ where: { id: trialId } });
    if (!trial || trial.userId !== userId) throw new NotFoundException('Sinov darsi topilmadi');
    if (![TrialLessonStatus.REQUESTED, TrialLessonStatus.APPROVED].includes(trial.status)) throw new ConflictException('Bu sinov darsini bekor qilib bo‘lmaydi');
    return this.prisma.trialLesson.update({ where: { id: trialId }, data: { status: TrialLessonStatus.CANCELLED } });
  }
}
