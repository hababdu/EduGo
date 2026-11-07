import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import { TeachingService } from '../teaching/teaching.service';

/** Toshkent vaqti bo'yicha ISO hafta kuni (1=Dushanba … 7=Yakshanba) va "HH:mm" */
export function tashkentNow(d = new Date()): { weekday: number; time: string } {
  const t = new Date(d.getTime() + 5 * 3_600_000);
  return { weekday: t.getUTCDay() === 0 ? 7 : t.getUTCDay(), time: t.toISOString().slice(11, 16) };
}

@Injectable()
export class PanelService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipsService, private readonly teaching: TeachingService) {}

  /**
   * Talaba / o'qituvchi / admin / ota-ona panellari va mobil ilova uchun BITTA so'rov:
   * kim, qaysi maktab, a'zoliklari, bugungi va keyingi darslar, admin uchun kutayotgan ishlar soni.
   */
  async context(user: CurrentUserPayload) {
    const [me, memberships] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, organization: { select: { id: true, name: true } } } }),
      this.memberships.mine(user),
    ]);
    const base = {
      user: { id: user.id, name: [me?.firstName, me?.lastName].filter(Boolean).join(' '), role: user.role },
      organization: me?.organization ?? null,
      memberships,
      standalone: !me?.organization,
    };

    if (user.role === 'PARENT') {
      const links = await this.prisma.parentLink.count({ where: { parentId: user.id } });
      return { ...base, children: links };
    }

    if (user.role === 'STUDENT' || user.role === 'TEACHER') {
      const [openTrials, slots] = await Promise.all([
        user.role === 'STUDENT' ? this.prisma.trialLesson.count({ where: { studentId: user.id, status: { in: ['REQUESTED', 'APPROVED'] } } }) : Promise.resolve(0),
        this.teaching.mine(user),
      ]);
      const now = tashkentNow();
      const today = slots.filter((s) => s.weekday === now.weekday);
      const upcoming = [...slots].filter((s) => s.weekday > now.weekday || (s.weekday === now.weekday && s.startTime > now.time)).slice(0, 3);
      return { ...base, openTrials, todayLessons: today, nextLessons: upcoming.length ? upcoming : slots.slice(0, 3) };
    }

    if (user.role === 'ADMIN' && user.organizationId) {
      const orgId = user.organizationId;
      const [pendingRequests, trialsNew, trialsUpcoming, pendingInvoices, roles] = await Promise.all([
        this.prisma.organizationMembership.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        this.prisma.trialLesson.count({ where: { organizationId: orgId, status: 'REQUESTED' } }),
        this.prisma.trialLesson.count({ where: { organizationId: orgId, status: 'APPROVED', scheduledAt: { gte: new Date() } } }),
        this.prisma.orgInvoice.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        this.prisma.organizationMembership.groupBy({ by: ['role'], where: { organizationId: orgId, status: 'ACTIVE' }, _count: true }),
      ]);
      const members: Record<string, number> = { STUDENT: 0, TEACHER: 0, ADMIN: 0 };
      for (const r of roles) members[r.role] = r._count;
      return { ...base, pending: { joinRequests: pendingRequests, trialRequests: trialsNew, upcomingTrials: trialsUpcoming, invoices: pendingInvoices }, members };
    }
    return base;
  }
}
