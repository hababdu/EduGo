import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

/**
 * Faqat O'QITUVCHI/ADMIN. Avval @Roles umuman yo'q edi: har qanday autentifikatsiyadan o'tgan foydalanuvchi
 * (o'quvchi ham) material yarata, o'zgartira va o'chira olardi.
 */
@Roles('TEACHER', 'ADMIN')
@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  async create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: CurrentUserPayload) {
    return await this.assignmentsService.create(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('groupId') groupId?: string) {
    return await this.assignmentsService.findAllForTeacher(user.id, groupId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return await this.assignmentsService.findOne(id, user.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto, @CurrentUser() user: CurrentUserPayload) {
    return await this.assignmentsService.update(id, user, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return await this.assignmentsService.remove(id, user.id);
  }
}
