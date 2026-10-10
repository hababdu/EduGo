import { Body, Controller, Get, Param, Patch, Post, Put, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewSubmissionDto, SubmitHomeworkDto } from './dto/submissions.dto';
import { SubmissionGradingService } from './submission-grading.service';
import { SubmissionsService } from './submissions.service';

@Controller('api/v1/submissions')
export class SubmissionsController {
  constructor(
    private readonly svc: SubmissionsService,
    private readonly grading: SubmissionGradingService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('STUDENT')
  @Get('assignments/:assignmentId/mine')
  async mine(@CurrentUser() u: CurrentUserPayload, @Param('assignmentId') id: string) {
    void this.grading.sweep();
    return this.svc.getMine(u, id);
  }

  @Roles('STUDENT')
  @Put('assignments/:assignmentId/mine')
  submit(@CurrentUser() u: CurrentUserPayload, @Param('assignmentId') id: string, @Body() dto: SubmitHomeworkDto) {
    return this.svc.submit(u, id, dto);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get('assignments/:assignmentId')
  async list(@CurrentUser() u: CurrentUserPayload, @Param('assignmentId') id: string) {
    void this.grading.sweep();
    return this.svc.listForTeacher(u, id);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/review')
  review(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: ReviewSubmissionDto) {
    return this.svc.review(u, id, dto);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Post('assignments/:assignmentId/grade-now')
  async gradeNow(@CurrentUser() u: CurrentUserPayload, @Param('assignmentId') id: string) {
    const a = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null, category: 'HOMEWORK' },
      select: { teacherId: true },
    });
    if (!a) throw new BadRequestException('Vazifa topilmadi');
    if (!['ADMIN', 'SUPER_ADMIN'].includes(u.role) && a.teacherId !== u.id) throw new ForbiddenException('Bu vazifa sizga tegishli emas');
    const r = await this.grading.forceNow(id);
    return { started: r !== null, result: r };
  }
}
