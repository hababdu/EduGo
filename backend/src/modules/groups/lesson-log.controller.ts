import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpsertLessonLogDto } from './dto/lesson-log.dto';
import { LessonLogService } from './lesson-log.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/groups/:groupId/lesson-log')
export class LessonLogController {
  constructor(private readonly logs: LessonLogService) {}

  @Roles('STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Get()
  list(@Param('groupId') groupId: string, @Query('limit') limit: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    return this.logs.list(groupId, user, limit ? Number(limit) : undefined);
  }

  @Roles('TEACHER', 'ADMIN')
  @Put()
  save(@Param('groupId') groupId: string, @Body() dto: UpsertLessonLogDto, @CurrentUser() user: CurrentUserPayload) {
    return this.logs.upsert(groupId, dto, user);
  }
}
