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

  /**
   * Yangi guruh yaratish — faqat ADMIN va TEACHER lar uchun
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  async create(
    @Body() body: { name: string; description?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.createGroup(body, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.findOneOrThrow(id, user);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get(':id/students')
  async listStudents(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const group = await this.groupsService.findOneOrThrow(id, user);
    return group.members;
  }

  /**
   * Guruhni o'chirish (Soft delete)
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.groupsService.deleteGroup(id, user);
  }
}