import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TrialAdmitDto, TrialApproveDto, TrialNoteDto, TrialQueryDto, TrialRequestDto } from './dto/trials.dto';
import { TrialsService } from './trials.service';

@Roles('STUDENT', 'PARENT')
@Controller('api/v1/trials')
export class TrialsController {
  constructor(private readonly svc: TrialsService) {}
  @Post() request(@CurrentUser() u: CurrentUserPayload, @Body() dto: TrialRequestDto) { return this.svc.request(u, dto); }
  @Get('mine') mine(@CurrentUser() u: CurrentUserPayload) { return this.svc.mine(u); }
  @Delete(':id') cancel(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.cancel(u, id); }
}

@Roles('ADMIN')
@Controller('api/v1/admin/trials')
export class AdminTrialsController {
  constructor(private readonly svc: TrialsService) {}
  @Get() list(@CurrentUser() u: CurrentUserPayload, @Query() q: TrialQueryDto) { return this.svc.list(u, q); }
  @Post(':id/approve') approve(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: TrialApproveDto) { return this.svc.approve(u, id, dto.scheduledAt, dto.note); }
  @Post(':id/decline') decline(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: TrialNoteDto) { return this.svc.decline(u, id, dto.note); }
  @Post(':id/attended') attended(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.attended(u, id); }
  @Post(':id/no-show') noShow(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.noShow(u, id); }
  @Post(':id/admit') admit(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: TrialAdmitDto) { return this.svc.admit(u, id, dto.groupId); }
}
