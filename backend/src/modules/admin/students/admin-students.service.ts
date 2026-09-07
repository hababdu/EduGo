import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListStudentsQueryDto, AdjustScoreDto } from './dto/admin-students.dto';

@Injectable()
export class AdminStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(query: ListStudentsQueryDto) {
    const where: any = { role: 'STUDENT', deletedAt: null };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.groupId) {
      where.groupMemberships = { some: { groupId: query.groupId } };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { studentProfile: true },
        orderBy: { registeredAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        status: u.status,
        registeredAt: u.registeredAt,
        lastActiveAt: u.lastActiveAt,
        totalScore: u.studentProfile?.totalScore ?? 0,
        level: u.studentProfile?.level ?? 1,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  /** 55-band — to'liq admin ko'rinishidagi student profili */
  async getDetail(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
        streak: true,
        groupMemberships: { include: { group: true } },
        testAttempts: {
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: { test: { select: { title: true } } },
        },
        achievements: { include: { achievement: true } },
      },
    });

    if (!user || user.role !== 'STUDENT' || user.deletedAt) {
      throw new NotFoundException('Student topilmadi');
    }

    return user;
  }

  async setBlocked(studentId: string, blocked: boolean, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student topilmadi');
    }

    const newStatus = blocked ? 'BLOCKED' : 'ACTIVE';
    await this.prisma.user.update({
      where: { id: studentId },
      data: { status: newStatus },
    });

    await this.audit.log({
      actorId,
      action: blocked ? 'STUDENT_BLOCK' : 'STUDENT_UNBLOCK',
      targetType: 'User',
      targetId: studentId,
      oldValue: { status: user.status },
      newValue: { status: newStatus },
    });

    return { id: studentId, status: newStatus };
  }

  /**
   * 56-band — MANUAL SCORE MANAGEMENT.
   * Har ikkala talab bajariladi: ScoreTransaction (ledger) + AdminActionLog (audit).
   * amount=0 rad etiladi — bunday amal mantiqsiz va noaniq audit yozuvi yaratadi.
   */
  async adjustScore(studentId: string, dto: AdjustScoreDto, actorId: string) {
    if (dto.amount === 0) {
      throw new BadRequestException('Ball miqdori 0 bo\'lishi mumkin emas');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
    });
    if (!profile) {
      throw new NotFoundException('Student profili topilmadi');
    }

    const type = dto.amount > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE';

    const [transaction] = await this.prisma.$transaction([
      this.prisma.scoreTransaction.create({
        data: {
          studentId,
          amount: dto.amount,
          type,
          description: dto.reason,
          createdById: actorId,
        },
      }),
      this.prisma.studentProfile.update({
        where: { userId: studentId },
        data: { totalScore: { increment: dto.amount } },
      }),
    ]);

    await this.audit.log({
      actorId,
      action: 'SCORE_ADJUST',
      targetType: 'User',
      targetId: studentId,
      oldValue: { totalScore: profile.totalScore },
      newValue: { totalScore: profile.totalScore + dto.amount, amount: dto.amount, reason: dto.reason },
    });

    this.eventEmitter.emit('score.changed', {
      studentId,
      delta: dto.amount,
      source: dto.amount > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE',
      subjectId: null,
      groupIds: [],
    });

    return transaction;
  }
}
