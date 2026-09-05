import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TeacherService } from './teacher.service';

@Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.teacherService.getOverview(user.id);
  }

  @Get('groups/:groupId/students')
  getGroupStudents(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teacherService.getGroupStudents(groupId, user);
  }
}
