import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';

@Controller('api/v1/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findAllForUser(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findOneOrThrow(id, user);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get(':id/students')
  async listStudents(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const group = await this.groupsService.findOneOrThrow(id, user);
    return group.members;
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  async create(@Body() body: { name: string; description?: string }, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.createGroup(body, user);
  }

  /**
   * Guruhga talaba qo'shish
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post(':id/students')
  async addStudentToGroup(
    @Param('id') id: string,
    @Body() body: { studentId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.addStudentToGroup(id, body.studentId, user);
  }

  /**
   * Talabani guruhdan chiqarib tashlash
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id/students/:studentId')
  async removeStudentFromGroup(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.removeStudentFromGroup(id, studentId, user);
  }

  /**
   * Guruhga asosiy ustoz biriktirish
   */
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/teacher')
  async assignTeacher(
    @Param('id') id: string,
    @Body() body: { teacherId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.assignTeacher(id, body.teacherId, user);
  }

  /**
   * Guruhga yordamchi (mentoring/assistant) ustoz biriktirish
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id/assistant')
  async assignAssistant(
    @Param('id') id: string,
    @Body() body: { assistantId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.assignAssistant(id, body.assistantId, user);
  }

  /**
   * Guruhni o'chirish
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.deleteGroup(id, user);
  }
}