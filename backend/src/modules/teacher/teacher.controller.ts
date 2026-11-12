import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ForbiddenException } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { TeacherService } from './teacher.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/teacher-assignments.dto';

@Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/teacher')
export class TeacherController {
  private activeOrganization(user: CurrentUserPayload): string {
    const organizationId = user.activeOrganizationId ?? user.organizationId;
    if (!organizationId) throw new ForbiddenException('Avval faol tashkilotni tanlang');
    return organizationId;
  }

  constructor(private readonly teacherService: TeacherService) {}

  /* ============ OVERVIEW ============ */
  @Get('overview')
  getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.getOverview(user.id, this.activeOrganization(user));
  }

  @Get('todo')
  getTodo(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.getTodo(user.id, this.activeOrganization(user));
  }

  /* ============ GROUPS ============ */
  @Get('groups')
  listMyGroups(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.listMyGroups(user.id, this.activeOrganization(user));
  }

  @Get('groups/:groupId')
  getMyGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getMyGroup(user.id, groupId, this.activeOrganization(user));
  }

  @Get('groups/:groupId/submission-stats')
  getSubmissionStats(@Param('groupId') groupId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.getGroupSubmissionStats(user.id, groupId, this.activeOrganization(user));
  }

  @Get('groups/:groupId/students')
  getGroupStudents(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getGroupStudents(groupId, user);
  }

  /* ============ ASSIGNMENTS ============ */
  @Get('assignments')
  listAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('groupId') groupId?: string,
  ) {
    return this.teacherService.listAssignments(user.id, this.activeOrganization(user), groupId);
  }

  @Get('assignments/:id')
  getAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getAssignment(user.id, id, this.activeOrganization(user));
  }

  @Post('assignments')
  createAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.teacherService.createAssignment(user.id, this.activeOrganization(user), dto);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.teacherService.updateAssignment(user.id, this.activeOrganization(user), id, dto);
  }

  @Delete('assignments/:id')
  removeAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.removeAssignment(user.id, this.activeOrganization(user), id);
  }
}