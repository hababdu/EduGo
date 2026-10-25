import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { assertSameOrg } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function certCode(len = 10): string {
  return Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join('');
}
const nameOf = (u: { firstName: string; lastName?: string | null }) => `${u.firstName} ${u.lastName ?? ''}`.trim();

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  /** Guruhni boshqarish huquqi: o'qituvchi — o'z guruhi; admin — o'z maktabi. */
  private async loadGroup(user: CurrentUserPayload, groupId: string) {
    const g = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, teacherId: true, organizationId: true, deletedAt: true, organization: { select: { name: true } } },
    });
    if (!g || g.deletedAt) throw new NotFoundException('Guruh topilmadi');
    if (user.role === 'ADMIN') assertSameOrg(user, g.organizationId);
    else if (user.role === 'TEACHER') { if (g.teacherId !== user.id) throw new ForbiddenException('Bu guruh sizga biriktirilmagan'); }
    else if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException("Ruxsat yo'q");
    return g;
  }

  async issue(user: CurrentUserPayload, dto: { studentId: string; groupId: string; title?: string }) {
    const g = await this.loadGroup(user, dto.groupId);
    const member = await this.prisma.groupMember.findFirst({
      where: { groupId: g.id, studentId: dto.studentId },
      select: { student: { select: { firstName: true, lastName: true, deletedAt: true } } },
    });
    if (!member || member.student.deletedAt) throw new BadRequestException("O'quvchi bu guruh a'zosi emas");

    const title = (dto.title?.trim() || `${g.name} kursini muvaffaqiyatli tugatdi`).slice(0, 160);
    const cert = await this.prisma.certificate.create({
      data: {
        code: certCode(), studentId: dto.studentId, groupId: g.id, organizationId: g.organizationId, title,
        studentName: nameOf(member.student), groupName: g.name, schoolName: g.organization?.name ?? 'EduGo', issuedById: user.id,
      },
    });
    await this.notifications.notify(dto.studentId, 'SYSTEM', '🎓 Sertifikat berildi', `${title}. Ilovada "Profil" bo'limidan ko'ring.`).catch(() => undefined);
    return cert;
  }

  mine(user: CurrentUserPayload) {
    return this.prisma.certificate.findMany({ where: { studentId: user.id, revokedAt: null }, orderBy: { issuedAt: 'desc' }, take: 50 });
  }

  async forGroup(user: CurrentUserPayload, groupId: string) {
    await this.loadGroup(user, groupId);
    return this.prisma.certificate.findMany({ where: { groupId }, orderBy: { issuedAt: 'desc' }, take: 200 });
  }

  async revoke(user: CurrentUserPayload, id: string) {
    const c = await this.prisma.certificate.findUnique({ where: { id }, select: { id: true, groupId: true, organizationId: true } });
    if (!c) throw new NotFoundException('Sertifikat topilmadi');
    if (c.groupId) await this.loadGroup(user, c.groupId);
    else if (user.role === 'ADMIN') assertSameOrg(user, c.organizationId);
    await this.prisma.certificate.update({ where: { id }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  /** Ochiq tekshiruv (kirishsiz): faqat sertifikatning o'zidagi ma'lumot qaytariladi. */
  async verify(codeRaw: string) {
    const code = String(codeRaw ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,16}$/.test(code)) throw new NotFoundException('Sertifikat topilmadi');
    const c = await this.prisma.certificate.findUnique({ where: { code } });
    if (!c) throw new NotFoundException('Sertifikat topilmadi');
    return { code: c.code, studentName: c.studentName, title: c.title, groupName: c.groupName, schoolName: c.schoolName, issuedAt: c.issuedAt, valid: !c.revokedAt };
  }
}
