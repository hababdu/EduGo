import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Req } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  async create(@Body() dto: CreateAssignmentDto, @Req() req) {
    const teacherId = req.user?.id || req.user?._id;
    return await this.assignmentsService.create(teacherId, dto);
  }

  @Get()
  async findAll(@Query('groupId') groupId?: string) {
    return await this.assignmentsService.findAll(groupId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAssignmentDto>) {
    return await this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.assignmentsService.remove(id);
  }
}