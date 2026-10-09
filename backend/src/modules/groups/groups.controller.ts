import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { ScheduleService } from './schedule.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findAllForUser(user);
  }

  /** Bugungi darslar (Toshkent vaqti bilan). ':id' dan OLDIN turishi shart. */
  @Get('schedule/today')
  async todayLessons(@CurrentUser() user: CurrentUserPayload) {
    return this.scheduleService.today(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const group = await this.groupsService.findOneOrThrow(id, user);
    // Talaba sinfdoshlarining ID/ro'yxatini ko'rmasligi kerak — faqat son
    if (user.role === 'STUDENT') {
      const { members, ...rest } = group as any;
      return { ...rest, memberCount: members?.length ?? 0 };
    }
    return group;
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get(':id/students')
  async getGroupStudents(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findGroupStudents(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  async create(
    @Body() body: CreateGroupDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.createGroup(body, user);
  }

  /** Guruhni tahrirlash. O'qituvchi faqat o'z guruhini va o'qituvchini O'ZGARTIRA OLMAYDI (faqat admin). */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateGroupDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.updateGroup(id, body, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post(':id/students')
  async addStudentToGroup(
    @Param('id') id: string,
    @Body() body: { studentId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.addStudentToGroup(id, body.studentId, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id/students/:studentId')
  async removeStudentFromGroup(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.removeStudentFromGroup(id, studentId, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/teacher')
  async assignTeacher(
    @Param('id') id: string,
    @Body() body: { teacherId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.assignTeacher(id, body.teacherId, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.deleteGroup(id, user);
  }
}