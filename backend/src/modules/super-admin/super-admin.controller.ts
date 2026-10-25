import { SchoolBackupService } from './school-backup.service';
import { BadRequestException, Body, Controller, Get, Param, ParseBoolPipe, Patch, Post, Put, Delete, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgBillingService } from './org-billing.service';
import { MoveAdminDto, MarkOrgPaymentDto, AssignAdminDto, AuditQueryDto, CreateOrgDto, UserSearchDto, UpdateAiDto, UpdateOrgDto } from './dto/super-admin.dto';
import { SuperAdminService } from './super-admin.service';

/** Faqat SUPER_ADMIN (RolesGuard: ADMIN ham kira olmaydi). */
@Roles('SUPER_ADMIN')
@Controller('api/v1/super')
export class SuperAdminController {
  constructor(private readonly svc: SuperAdminService, private readonly billing: OrgBillingService, private readonly backup: SchoolBackupService) {}

  @Post('organizations/:id/restore')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  async restore(@Param('id') id: string, @Query('apply') apply: string | undefined, @UploadedFile() file: { buffer: Buffer } | undefined, @CurrentUser() u: CurrentUserPayload) {
    if (!file?.buffer) throw new BadRequestException('Zaxira faylini yuklang (.json.gz)');
    const dryRun = apply !== '1';
    const r = await this.backup.restore(id, file.buffer, dryRun);
    if (!dryRun) await this.svc.auditAction(u, 'ORG_RESTORE', 'Organization', id, null, r.toRestore);
    return r;
  }

  @Post('organizations/:id/backup') runBackup(@Param('id') id: string) { return this.backup.backup(id); }

  /** Maktab obunalari (maktab → super admin) */
  @Get('billing') billingOverview(@Query('month') month?: string) { return this.billing.overview(month); }
  @Get('billing/:orgId') billingHistory(@Param('orgId') orgId: string) { return this.billing.history(orgId); }
  @Put('billing/:orgId') billingMark(@CurrentUser() u: CurrentUserPayload, @Param('orgId') orgId: string, @Body() dto: MarkOrgPaymentDto) { return this.billing.mark(u, orgId, dto); }

  @Get('overview') overview() { return this.svc.overview(); }

  @Get('organizations') orgs() { return this.svc.listOrgs(); }
  @Post('organizations') createOrg(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateOrgDto) { return this.svc.createOrg(u, dto); }
  @Patch('organizations/:id') updateOrg(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateOrgDto) { return this.svc.updateOrg(u, id, dto); }
  @Get('organizations/:id/detail') orgDetail(@Param('id') id: string) { return this.svc.orgDetail(id); }
  @Patch('admins/:userId/organization') moveAdmin(@CurrentUser() u: CurrentUserPayload, @Param('userId') userId: string, @Body() dto: MoveAdminDto) { return this.svc.moveAdmin(u, userId, dto.organizationId); }
  @Post('organizations/:id/admins') assign(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: AssignAdminDto) { return this.svc.assignAdmin(u, id, dto); }
  @Delete('organizations/:id/admins/:userId') unassign(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Param('userId') userId: string) { return this.svc.removeAdmin(u, id, userId); }

  @Get('users') users(@Query() q: UserSearchDto) { return this.svc.candidates(q.search); }
  @Get('admins') admins() { return this.svc.listAdmins(); }
  @Patch('users/:id/block') block(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body('blocked', ParseBoolPipe) blocked: boolean) { return this.svc.setBlocked(u, id, blocked); }

  @Get('ai') ai() { return this.svc.ai(); }
  @Put('ai') updateAi(@CurrentUser() u: CurrentUserPayload, @Body() dto: UpdateAiDto) { return this.svc.updateAi(u, dto); }

  @Get('audit') audit(@Query() q: AuditQueryDto) { return this.svc.auditLog(Number(q.page) || 1, q.action || undefined); }

  @Get('system') system() { return this.svc.system(); }
}

/** ADMIN: faqat o'z maktabining obuna holatini ko'radi (belgilay olmaydi). */
@Roles('ADMIN')
@Controller('api/v1/admin/subscription')
export class AdminSubscriptionController {
  constructor(private readonly billing: OrgBillingService) {}
  @Get() mine(@CurrentUser() u: CurrentUserPayload) { return this.billing.mine(u); }
}
