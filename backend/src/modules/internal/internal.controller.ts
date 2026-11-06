// src/modules/internal/internal.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_UPLOAD_BYTES } from '../materials/material-file.util';
import { Public } from '../../common/decorators/public.decorator';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { AppLoginService } from '../auth/app-login.service';
import { ParentsService } from '../parents/parents.service';
import { InternalService } from './internal.service';

@Public()
@UseGuards(InternalAuthGuard)
@Controller('api/v1/internal')
export class InternalController {
  constructor(
    private readonly internalService: InternalService,
    private readonly appLogin: AppLoginService,
    private readonly parents: ParentsService,
  ) {}

  /** Bot: ota-ona `/start parent_<kod>` bosganda farzandga bog'laydi. */
  @Post('parents/link')
  @HttpCode(200)
  linkParent(@Body() body: { code: string; user: { id: number; first_name: string; last_name?: string; username?: string } }) {
    return this.parents.linkByCode(body?.code, body?.user);
  }

  /** Bot: foydalanuvchi `/start login_<id>` bosganda ilova kirishini tasdiqlaydi. */
  @Post('app-login/confirm')
  @HttpCode(200)
  confirmAppLogin(@Body() body: { id: string; user: { id: number; first_name: string; last_name?: string; username?: string } }) {
    return this.appLogin.confirm(String(body?.id ?? ''), body?.user);
  }

  /* ============================================================
     USER ROLE
     ============================================================ */
  @Get('users/by-telegram/:telegramId/role')
  getUserRole(@Param('telegramId') telegramId: string) {
    return this.internalService.getUserRole(telegramId);
  }

  /* ============================================================
     STUDENT
     ============================================================ */
  @Get('students/by-telegram/:telegramId/summary')
  getSummary(@Param('telegramId') telegramId: string) {
    return this.internalService.getStudentSummary(telegramId);
  }

  @Get('students/by-telegram/:telegramId/results')
  getResults(
    @Param('telegramId') telegramId: string,
    @Query('limit') limit?: string,
  ) {
    return this.internalService.getRecentResults(
      telegramId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('students/by-telegram/:telegramId/achievements')
  getAchievements(@Param('telegramId') telegramId: string) {
    return this.internalService.getAchievements(telegramId);
  }

  /* ============================================================
     RANKING
     ============================================================ */
  @Get('ranking/top')
  getTopRanking(@Query('limit') limit?: string) {
    return this.internalService.getTopRanking(limit ? Number(limit) : undefined);
  }

  /* ============================================================
     ANNOUNCEMENTS
     ============================================================ */
  @Get('announcements')
  getAnnouncements(@Query('limit') limit?: string) {
    return this.internalService.getRecentAnnouncements(
      limit ? Number(limit) : undefined,
    );
  }

  /* ============================================================
     TEACHER
     ============================================================ */
  @Get('teachers/by-telegram/:telegramId/overview')
  getTeacherOverview(@Param('telegramId') telegramId: string) {
    return this.internalService.getTeacherOverview(telegramId);
  }

  @Get('teachers/by-telegram/:telegramId/groups')
  getTeacherGroups(@Param('telegramId') telegramId: string) {
    return this.internalService.getTeacherGroups(telegramId);
  }

  /* ============================================================
     ADMIN
     ============================================================ */
  @Get('admins/by-telegram/:telegramId/overview')
  getAdminOverview(@Param('telegramId') telegramId: string) {
    return this.internalService.getAdminOverview(telegramId);
  }

  /* ============================================================
     SUPER ADMIN: rol almashtirish
     ============================================================ */
  @Get('users/by-telegram/:telegramId/switch-options')
  switchOptions(@Param('telegramId') telegramId: string) {
    return this.internalService.switchOptions(telegramId);
  }

  @Post('users/by-telegram/:telegramId/switch-role')
  @HttpCode(200)
  switchRole(@Param('telegramId') telegramId: string, @Body() body: { role: string; organizationId?: string }) {
    return this.internalService.switchRole(telegramId, body);
  }

  /* ============================================================
     O'QUVCHI: vazifa topshirish (bot orqali)
     ============================================================ */
  @Get('students/by-telegram/:telegramId/homework')
  listHomework(@Param('telegramId') telegramId: string) {
    return this.internalService.listHomework(telegramId);
  }

  @Get('students/by-telegram/:telegramId/homework/:assignmentId')
  homeworkDetail(@Param('telegramId') telegramId: string, @Param('assignmentId') assignmentId: string) {
    return this.internalService.homeworkDetail(telegramId, assignmentId);
  }

  @Post('students/by-telegram/:telegramId/homework-files')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  uploadHomeworkFile(
    @Param('telegramId') telegramId: string,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    return this.internalService.uploadHomeworkFile(telegramId, file);
  }

  @Post('students/by-telegram/:telegramId/homework-files/:fileId/delete')
  @HttpCode(200)
  removeHomeworkFile(@Param('telegramId') telegramId: string, @Param('fileId') fileId: string) {
    return this.internalService.removeHomeworkFile(telegramId, fileId);
  }

  @Post('students/by-telegram/:telegramId/homework/:assignmentId/submit')
  @HttpCode(200)
  submitHomework(
    @Param('telegramId') telegramId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: { textAnswer?: string; fileIds?: string[] },
  ) {
    return this.internalService.submitHomework(telegramId, assignmentId, body);
  }
}
