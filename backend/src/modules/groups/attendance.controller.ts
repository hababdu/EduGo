import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/attendance.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/groups/:groupId/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** O'quvchining o'z davomati (statik yo'llar `:date` kabi dinamiklardan oldin turadi) */
  @Roles('STUDENT')
  @Get('me')
  me(@Param('groupId') groupId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.attendance.mySummary(groupId, user);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get('summary')
  summary(
    @Param('groupId') groupId: string,
    @Query('days') days: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendance.summary(groupId, days ? Number(days) : undefined, user);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get()
  day(
    @Param('groupId') groupId: string,
    @Query('date') date: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendance.getDay(groupId, date, user);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Put()
  mark(
    @Param('groupId') groupId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendance.markDay(groupId, dto, user);
  }
}
