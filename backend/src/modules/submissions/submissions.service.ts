import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MaterialsService } from '../materials/materials.service';
import { TelegramStorageService } from '../materials/telegram-storage.service';
import { ReviewSubmissionDto, SubmitHomeworkDto } from './dto/submissions.dto';

const STAFF = ['ADMIN', 'SUPER_ADMIN'];

type SubmissionRow = {
  id: string;
  status: string;
  textAnswer: string | null;
  submittedAt: Date;
  aiScore: number | null;
  aiFeedback: string | null;
  aiStrengths: string[];
  aiImprovements: string[];
  gradedAt: Date | null;
  teacherScore: number | null;
  teacherFeedback: string | null;
  gradeError?: string | null;
  files?: { id: string; kind: string; fileName: string; mimeType: string; sizeBytes: number; order: number }[];
};

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly materials: MaterialsService,
    private readonly tg: TelegramStorageService,
  ) {}

  /* ───────────── yordamchilar ───────────── */
  /** Yakuniy ball: o'qituvchi tuzatgan bo'lsa — shu, aks holda AI bahosi */
  finalScore(s: { teacherScore: number | null; aiScore: number | null }): number | null {
    return s.teacherScore ?? s.aiScore ?? null;
  }

  private async loadHomework(assignmentId: string) {
    const a = await this.prisma.teacherAssignment.findFirst({
      where: { id: assignmentId, deletedAt: null },
      select: {
        id: true, title: true, groupId: true, teacherId: true, status: true, category: true,
        dueAt: true, maxScore: true, gradingStatus: true,
      },
    });
    if (!a) throw new NotFoundException('Vazifa topilmadi');
    return a;
  }

  private canSubmitNow(a: { status: string; category: string; dueAt: Date | null; gradingStatus: string }) {
    if (a.category !== 'HOMEWORK') return { ok: false, reason: 'Bu material topshiriladigan vazifa emas' };
    if (a.status !== 'PUBLISHED') return { ok: false, reason: 'Vazifa hali e\'lon qilinmagan' };
    if (a.gradingStatus !== 'PENDING') return { ok: false, reason: 'Topshirish yopilgan, baholash boshlangan' };
    if (a.dueAt && a.dueAt.getTime() <= Date.now()) return { ok: false, reason: 'Topshirish muddati tugagan' };
    return { ok: true as const, reason: null };
  }

  private async assertMember(studentId: string, groupId: string) {
    const m = await this.prisma.groupMember.findFirst({ where: { studentId, groupId }, select: { id: true } });
    if (!m) throw new ForbiddenException("Siz bu guruhga a'zo emassiz");
  }

  private fileDto(f: { id: string; kind: string; fileName: string; mimeType: string; sizeBytes: number; order: number }) {
    return this.materials.toDto(f);
  }

  /** Talabaga ko'rsatiladigan topshiriq: baho faqat baholanib bo'lgach ochiladi */
  private studentView(s: SubmissionRow | null, maxScore: number) {
    if (!s) return null;
    const graded = s.status === 'GRADED';
    return {
      id: s.id,
      status: s.status,
      textAnswer: s.textAnswer,
      submittedAt: s.submittedAt,
      files: (s.files ?? []).map((f) => this.fileDto(f)),
      score: graded ? this.finalScore(s) : null,
      maxScore,
      feedback: graded ? s.teacherFeedback ?? s.aiFeedback : null,
      strengths: graded && !s.teacherFeedback ? s.aiStrengths : [],
      improvements: graded && !s.teacherFeedback ? s.aiImprovements : [],
      gradedBy: graded ? (s.teacherScore !== null ? 'TEACHER' : 'AI') : null,
      gradedAt: s.gradedAt,
    };
  }

  /* ───────────── O'QUVCHI ───────────── */
  async getMine(user: CurrentUserPayload, assignmentId: string) {
    const a = await this.loadHomework(assignmentId);
    await this.assertMember(user.id, a.groupId);
    if (a.status !== 'PUBLISHED') throw new NotFoundException('Vazifa topilmadi');
    const sub = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      include: { files: { orderBy: { order: 'asc' } } },
    });
    const can = this.canSubmitNow(a);
    return {
      assignment: { id: a.id, title: a.title, dueAt: a.dueAt, maxScore: a.maxScore, gradingStatus: a.gradingStatus },
      canSubmit: can.ok,
      closedReason: can.reason,
      submission: this.studentView(sub as SubmissionRow | null, a.maxScore),
    };
  }

  async submit(user: CurrentUserPayload, assignmentId: string, dto: SubmitHomeworkDto) {
    const a = await this.loadHomework(assignmentId);
    await this.assertMember(user.id, a.groupId);
    const can = this.canSubmitNow(a);
    if (!can.ok) throw new ForbiddenException(can.reason);

    const text = dto.textAnswer?.trim() || null;
    const fileIds = Array.from(new Set(dto.fileIds ?? []));
    if (!text && fileIds.length === 0) throw new BadRequestException('Javob matnini yozing yoki fayl biriktiring');

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      include: { files: true },
    });

    // Fayllar shu o'quvchiniki bo'lishi, boshqa joyga biriktirilmagan (yoki shu topshiriqniki) bo'lishi shart
    if (fileIds.length) {
      const owned = await this.prisma.materialFile.findMany({
        where: {
          id: { in: fileIds },
          uploaderId: user.id,
          assignmentId: null,
          OR: [{ submissionId: null }, ...(existing ? [{ submissionId: existing.id }] : [])],
        },
        select: { id: true },
      });
      if (owned.length !== fileIds.length) throw new BadRequestException("Fayllardan biri sizga tegishli emas yoki ishlatib bo'lingan");
    }

    const sub = await this.prisma.$transaction(async (tx) => {
      const row = existing
        ? await tx.assignmentSubmission.update({
            where: { id: existing.id },
            data: { textAnswer: text, status: 'SUBMITTED', submittedAt: new Date() },
          })
        : await tx.assignmentSubmission.create({
            data: { assignmentId, studentId: user.id, textAnswer: text },
          });
      await tx.materialFile.updateMany({ where: { id: { in: fileIds } }, data: { submissionId: row.id } });
      return row;
    });

    // Ro'yxatdan chiqarilgan eski fayllarni olib tashlaymiz
    const removed = (existing?.files ?? []).filter((f) => !fileIds.includes(f.id));
    for (const f of removed) {
      await this.prisma.materialFile.delete({ where: { id: f.id } }).catch(() => undefined);
      if (f.tgMessageId) {
        const shared = await this.prisma.materialFile.count({ where: { tgFileId: f.tgFileId } });
        if (shared === 0) await this.tg.remove(f.tgMessageId).catch(() => undefined);
      }
    }

    return this.getMine(user, assignmentId);
  }

  /* ───────────── O'QITUVCHI ───────────── */
  private async assertTeacherAccess(user: CurrentUserPayload, assignmentId: string) {
    const a = await this.loadHomework(assignmentId);
    if (!STAFF.includes(user.role) && a.teacherId !== user.id) throw new ForbiddenException("Bu vazifa sizga tegishli emas");
    return a;
  }

  async listForTeacher(user: CurrentUserPayload, assignmentId: string) {
    const a = await this.assertTeacherAccess(user, assignmentId);
    const [members, subs] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: a.groupId },
        select: { student: { select: { id: true, firstName: true, lastName: true, username: true } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        include: { files: { orderBy: { order: 'asc' } } },
      }),
    ]);
    const byStudent = new Map(subs.map((s) => [s.studentId, s]));
    const rows = members.map(({ student }) => {
      const s = byStudent.get(student.id);
      return {
        student,
        submission: s
          ? {
              id: s.id,
              status: s.status,
              textAnswer: s.textAnswer,
              submittedAt: s.submittedAt,
              files: s.files.map((f) => this.fileDto(f)),
              aiScore: s.aiScore,
              aiFeedback: s.aiFeedback,
              aiStrengths: s.aiStrengths,
              aiImprovements: s.aiImprovements,
              teacherScore: s.teacherScore,
              teacherFeedback: s.teacherFeedback,
              finalScore: this.finalScore(s),
              gradeError: s.status === 'FAILED' ? s.gradeError : null,
              gradedAt: s.gradedAt,
            }
          : null,
      };
    });
    const graded = subs.filter((s) => this.finalScore(s) !== null && s.status === 'GRADED');
    return {
      assignment: { id: a.id, title: a.title, dueAt: a.dueAt, maxScore: a.maxScore, gradingStatus: a.gradingStatus },
      summary: {
        total: members.length,
        submitted: subs.length,
        graded: graded.length,
        needsReview: subs.filter((s) => s.status === 'NEEDS_REVIEW').length,
        failed: subs.filter((s) => s.status === 'FAILED').length,
        average: graded.length
          ? Math.round(graded.reduce((n, s) => n + (this.finalScore(s) ?? 0), 0) / graded.length)
          : null,
      },
      rows,
    };
  }

  async review(user: CurrentUserPayload, submissionId: string, dto: ReviewSubmissionDto) {
    const sub = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { id: true, title: true, teacherId: true, maxScore: true, deletedAt: true } } },
    });
    if (!sub || sub.assignment.deletedAt) throw new NotFoundException('Topshiriq topilmadi');
    if (!STAFF.includes(user.role) && sub.assignment.teacherId !== user.id) throw new ForbiddenException('Ruxsat yo\'q');
    if (dto.score > sub.assignment.maxScore) throw new BadRequestException(`Ball ${sub.assignment.maxScore} dan oshmasin`);

    await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        teacherScore: dto.score,
        teacherFeedback: dto.feedback?.trim() || null,
        reviewedAt: new Date(),
        status: 'GRADED',
        gradedAt: sub.gradedAt ?? new Date(),
      },
    });
    await this.notifications
      .notify(
        sub.studentId,
        'TEST_RESULT',
        '📝 Vazifangiz baholandi',
        `"${sub.assignment.title}": ${dto.score}/${sub.assignment.maxScore} (o'qituvchi bahosi)`,
      )
      .catch(() => undefined);
    return { ok: true };
  }
}
