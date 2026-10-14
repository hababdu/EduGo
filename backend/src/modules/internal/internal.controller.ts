// src/modules/internal/internal.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { AppLoginService } from '../auth/app-login.service';
import { InternalService } from './internal.service';

@Public()
@UseGuards(InternalAuthGuard)
@Controller('api/v1/internal')
export class InternalController {
  constructor(
    private readonly internalService: InternalService,
    private readonly appLogin: AppLoginService,
  ) {}

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
}