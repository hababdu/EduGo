import { BadRequestException, Controller, ForbiddenException, Get, Param, Post, Query, Res, ServiceUnavailableException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramStorageService } from '../materials/telegram-storage.service';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('api/v1/upload')
export class UploadController {
  constructor(private readonly prisma: PrismaService, private readonly telegram: TelegramStorageService) {}

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => MIME.has(file.mimetype)
      ? cb(null, true)
      : cb(new BadRequestException('Faqat JPG, PNG yoki WebP rasm yuklang'), false),
  }))
  async uploadImage(
    @CurrentUser() actor: CurrentUserPayload,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    @Query('organizationId') requestedOrgId?: string,
    @Query('groupId') groupId?: string,
    @Query('purpose') purpose?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Rasm tanlanmadi');
    if (file.buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Rasm hajmi 8 MB dan oshmasin');

    let organizationId: string | null = null;
    if (actor.role === 'SUPER_ADMIN') {
      if (!requestedOrgId) throw new BadRequestException('Maktabni tanlang');
      organizationId = requestedOrgId;
    } else if (actor.role === 'ADMIN') {
      organizationId = actor.organizationId ?? null;
      if (!organizationId) throw new ForbiddenException('Admin hech qaysi maktabga biriktirilmagan');
      if (requestedOrgId && requestedOrgId !== organizationId) throw new ForbiddenException('Bu boshqa maktab');
    } else {
      if (!groupId) throw new BadRequestException('Faylni yuklash uchun guruh konteksti kerak');
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, deletedAt: null },
        select: { id: true, organizationId: true, teacherId: true, assistantId: true, members: { where: { studentId: actor.id }, select: { id: true } } },
      });
      if (!group?.organizationId) throw new BadRequestException('Guruh maktabga biriktirilmagan');
      if (actor.role === 'TEACHER' && group.teacherId !== actor.id && group.assistantId !== actor.id) {
        throw new ForbiddenException('Siz bu guruhga biriktirilmagansiz');
      }
      if (actor.role === 'STUDENT' && !group.members.length) throw new ForbiddenException('Siz bu guruh a’zosi emassiz');
      if (actor.role === 'PARENT') {
        const child = await this.prisma.parentLink.findFirst({ where: { parentId: actor.id }, select: { studentId: true } });
        if (!child || !(await this.prisma.groupMember.findFirst({ where: { groupId, studentId: child.studentId }, select: { id: true } }))) {
          throw new ForbiddenException('Farzandingiz ushbu guruhga biriktirilmagan');
        }
      }
      organizationId = group.organizationId;
    }

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, storageChatId: true } });
    if (!org) throw new BadRequestException('Maktab topilmadi');
    if (!org.storageChatId) throw new ServiceUnavailableException('Ushbu maktab uchun yopiq Telegram kanali sozlanmagan');
    const cleanName = file.originalname.replace(/[\\\\/\\r\\n]/g, '_').slice(0, 180) || 'poster';
    const stored = await this.telegram.store(file.buffer, cleanName, file.mimetype, org.storageChatId);
    const asset = await this.prisma.schoolMediaAsset.create({
      data: {
        organizationId: org.id,
        uploaderId: actor.id,
        purpose: purpose === 'GROUP_POSTER' ? 'GROUP_POSTER' : 'SCHOOL_POSTER',
        fileName: cleanName,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        telegramFileId: stored.fileId,
        telegramMessageId: stored.messageId,
        telegramChatId: stored.chatId,
        isPublic: !groupId && purpose !== 'GROUP_POSTER',
      },
    });
    return { id: asset.id, url: asset.isPublic ? `/api/v1/upload/assets/${asset.id}` : `/api/v1/upload/assets/${asset.id}/private` };
  }

  @Public()
  @Get('assets/:id')
  async publicAsset(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.prisma.schoolMediaAsset.findFirst({
      where: { id, isPublic: true, purpose: 'SCHOOL_POSTER', organization: { isPublic: true, status: 'ACTIVE' } },
    });
    if (!asset) throw new BadRequestException('Ommaviy rasm topilmadi');
    const buffer = await this.telegram.download(asset.telegramFileId, asset.sizeBytes);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(buffer);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @Get('assets/:id/private')
  async privateAsset(@Param('id') id: string, @CurrentUser() actor: CurrentUserPayload, @Res() res: Response) {
    const asset = await this.prisma.schoolMediaAsset.findUnique({ where: { id } });
    if (!asset) throw new BadRequestException('Rasm topilmadi');
    let allowed = actor.role === 'SUPER_ADMIN';
    if (actor.role === 'ADMIN') allowed = actor.organizationId === asset.organizationId;
    if (actor.role === 'TEACHER' || actor.role === 'STUDENT' || actor.role === 'PARENT') {
      const memberships = await this.prisma.organizationMembership.findFirst({ where: { userId: actor.id, organizationId: asset.organizationId, status: 'ACTIVE' }, select: { id: true } });
      allowed = !!memberships && asset.uploaderId === actor.id;
    }
    if (!allowed) throw new ForbiddenException('Bu rasmga ruxsat yo‘q');
    const buffer = await this.telegram.download(asset.telegramFileId, asset.sizeBytes);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buffer);
  }
}
