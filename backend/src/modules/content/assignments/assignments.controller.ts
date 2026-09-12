import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  create(@Body() dto: CreateAssignmentDto, @Req() req) {
    const teacherId = req.user.id; // Autentifikatsiya qilingan o'qituvchi ID si
    return this.assignmentsService.create(teacherId, dto);
  }

  @Get()
  findAll(@Query('groupId') groupId?: string) {
    return this.assignmentsService.findAll(groupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAssignmentDto>) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}