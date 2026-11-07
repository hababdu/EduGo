import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignDto, AssignmentsQueryDto, OrgQueryDto, SlotDto, SubjectDto } from './dto/teaching.dto';
import { TeachingService } from './teaching.service';

/** Maktab admini (o'z maktabi) / SUPER_ADMIN */
@Roles('ADMIN')
@Controller('api/v1/admin/teaching')
export class AdminTeachingController {
  constructor(private readonly svc: TeachingService) {}

  @Get('subjects') subjects(@CurrentUser() u: CurrentUserPayload, @Query() q: OrgQueryDto) { return this.svc.listSubjects(u, q.organizationId); }
  @Post('subjects') createSubject(@CurrentUser() u: CurrentUserPayload, @Body() dto: SubjectDto) { return this.svc.createSubject(u, dto.name, dto.organizationId); }
  @Delete('subjects/:id') removeSubject(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.removeSubject(u, id); }

  @Get('assignments') assignments(@CurrentUser() u: CurrentUserPayload, @Query() q: AssignmentsQueryDto) { return this.svc.listAssignments(u, q); }
  @Post('assignments') assign(@CurrentUser() u: CurrentUserPayload, @Body() dto: AssignDto, @Query() q: OrgQueryDto) { return this.svc.assign(u, dto, q.organizationId); }
  @Delete('assignments/:id') unassign(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.unassign(u, id); }

  @Get('timetable') timetable(@CurrentUser() u: CurrentUserPayload, @Query() q: AssignmentsQueryDto) { return this.svc.timetable(u, q); }
  @Post('assignments/:id/slots') addSlot(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: SlotDto) { return this.svc.addSlot(u, id, dto); }
  @Delete('slots/:id') removeSlot(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.removeSlot(u, id); }
}

/** O'qituvchi / o'quvchi o'z haftalik jadvalini ko'radi */
@Roles('TEACHER', 'STUDENT')
@Controller('api/v1/timetable')
export class TimetableController {
  constructor(private readonly svc: TeachingService) {}
  @Get('mine') mine(@CurrentUser() u: CurrentUserPayload) { return this.svc.mine(u); }
}
