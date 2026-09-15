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
  constructor(private readonly teacherService: TeacherService) {}

  /* ============ OVERVIEW ============ */
  @Get('overview')
  getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.getOverview(user.id);
  }

  /* ============ GROUPS ============ */
  @Get('groups')
  listMyGroups(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.listMyGroups(user.id);
  }

  @Get('groups/:groupId')
  getMyGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getMyGroup(user.id, groupId);
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
    return this.teacherService.listAssignments(user.id, groupId);
  }

  @Get('assignments/:id')
  getAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getAssignment(user.id, id);
  }

  @Post('assignments')
  createAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.teacherService.createAssignment(user.id, dto);
  }

  @Patch('assignments/:id')
  updateAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.teacherService.updateAssignment(user.id, id, dto);
  }

  @Delete('assignments/:id')
  removeAssignment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.removeAssignment(user.id, id);
  }
}