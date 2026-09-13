import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete, 
  Query, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

interface RequestWithUser extends Request {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
  };
}

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  async create(@Body() dto: CreateAssignmentDto, @Req() req: RequestWithUser) {
    const teacherId = req.user?.id || req.user?._id || req.user?.userId || '';
    return await this.assignmentsService.create(teacherId, dto);
  }

  @Get()
  async findAll(@Query('groupId') groupId?: string, @Req() req?: RequestWithUser) {
    const teacherId = req?.user?.id || req?.user?._id || req?.user?.userId || '';
    return await this.assignmentsService.findAllForTeacher(teacherId, groupId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const teacherId = req.user?.id || req.user?._id || req.user?.userId || '';
    return await this.assignmentsService.findOne(id, teacherId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() dto: Partial<CreateAssignmentDto>, 
    @Req() req: RequestWithUser
  ) {
    const teacherId = req.user?.id || req.user?._id || req.user?.userId || '';
    return await this.assignmentsService.update(id, teacherId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const teacherId = req.user?.id || req.user?._id || req.user?.userId || '';
    return await this.assignmentsService.remove(id, teacherId);
  }
}
