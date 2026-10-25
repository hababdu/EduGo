import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { canEditCreatedBy, sameOrg } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';

export type ContentLevel = 'subject' | 'section' | 'topic' | 'lesson';

const ORG = { createdBy: { select: { organizationId: true } } };
const COURSE = { select: ORG };
const SUBJECT = { select: { course: COURSE } };
const SECTION = { select: { subject: SUBJECT } };
const TOPIC = { select: { section: SECTION } };

/** Kontent (kurs) yaratuvchisining tashkiloti. null = platforma kontenti. Topilmasa — 404. */
export async function creatorOrgOf(prisma: PrismaService, level: ContentLevel, id: string): Promise<string | null> {
  const p: any = prisma;
  let row: any;
  switch (level) {
    case 'subject':
      row = await p.subject.findUnique({ where: { id }, select: { course: COURSE } });
      return notFound(row)?.course?.createdBy?.organizationId ?? null;
    case 'section':
      row = await p.section.findUnique({ where: { id }, select: { subject: SUBJECT } });
      return notFound(row)?.subject?.course?.createdBy?.organizationId ?? null;
    case 'topic':
      row = await p.topic.findUnique({ where: { id }, select: { section: SECTION } });
      return notFound(row)?.section?.subject?.course?.createdBy?.organizationId ?? null;
    case 'lesson':
      row = await p.lesson.findUnique({ where: { id }, select: { topic: TOPIC } });
      return notFound(row)?.topic?.section?.subject?.course?.createdBy?.organizationId ?? null;
  }
}

function notFound<T>(row: T | null | undefined): T {
  if (!row) throw new NotFoundException('Topilmadi');
  return row;
}

/** O'zgartirish: faqat o'z tashkiloti kontenti (platforma kontentini faqat super admin). */
export async function assertCanEditContent(prisma: PrismaService, user: CurrentUserPayload, level: ContentLevel, id: string) {
  const org = await creatorOrgOf(prisma, level, id);
  if (!canEditCreatedBy(user, org)) throw new ForbiddenException("Bu kontent sizning maktabingizga tegishli emas");
}

/** Ko'rish: o'z maktabi yoki platforma kontenti; boshqa maktabniki — mavjud emasdek (404). */
export async function assertCanSeeContent(prisma: PrismaService, user: CurrentUserPayload, level: ContentLevel, id: string) {
  const org = await creatorOrgOf(prisma, level, id);
  if (org !== null && !sameOrg(user, org)) throw new NotFoundException('Topilmadi');
}
