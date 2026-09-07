import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  FilterStudentsDto,
  AdjustScoreDto,
  AssignGroupDto,
  CreateGroupDto,
  CreateSubjectDto,
  AssignTeacherSubjectDto,
  UpdateUserRoleDto,
} from './dto/admin-api.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('admin')
@Roles('ADMIN')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('students')
  getStudents(@Query() query: FilterStudentsDto) {
    return this.adminService.getStudents(query);
  }

  @Get('students/:id')
  getStudentDetail(@Param('id') id: string) {
    return this.adminService.getStudentDetail(id);
  }

  @Patch('students/:id/block')
  blockStudent(@Param('id') id: string) {
    return this.adminService.setStudentBlock(id, true);
  }

  @Patch('students/:id/unblock')
  unblockStudent(@Param('id') id: string) {
    return this.adminService.setStudentBlock(id, false);
  }

  @Patch('students/:id/score')
  adjustScore(@Param('id') id: string, @Body() dto: AdjustScoreDto) {
    return this.adminService.adjustScore(id, dto);
  }

  @Patch('students/:studentId/group')
  assignStudentGroup(
    @Param('studentId') studentId: string,
    @Body() dto: AssignGroupDto,
  ) {
    return this.adminService.assignStudentGroup(studentId, dto.groupId);
  }

  @Get('teachers')
  getTeachers() {
    return this.adminService.getTeachers();
  }

  @Post('teachers/:teacherId/subjects')
  assignTeacherSubject(
    @Param('teacherId') teacherId: string,
    @Body() dto: AssignTeacherSubjectDto,
  ) {
    return this.adminService.assignTeacherSubject(teacherId, dto.subjectId);
  }

  @Get('groups')
  getGroups() {
    return this.adminService.getGroups();
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.adminService.createGroup(dto);
  }

  @Get('subjects')
  getSubjects() {
    return this.adminService.getSubjects();
  }

  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.adminService.createSubject(dto);
  }

  @Patch('users/:userId/role')
  updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, dto.role);
  }
}