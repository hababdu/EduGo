import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TestManagementService } from './test-management.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';

@Controller('api/v1/tests')
export class TestManagementController {
  constructor(private readonly service: TestManagementService) {}

  /** Student uchun — o'ziga tayinlangan testlar. Rol cheklovi yo'q, hamma o'zinikini ko'radi. */
  @Get('assigned/me')
  listAssigned(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listAssignedForStudent(user.id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Get()
  list(
    @Query('subjectId') subjectId: string,
    @Query('status') status: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.list(user, { subjectId, status });
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.getDetail(id, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateTestDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Patch(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.publish(id, user.id);
  }

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.assign(id, dto, user.id);
  }

  /** 26-band — faqat ADMIN/SUPER_ADMIN (teacher emas — bu jiddiy amal) */
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reopen')
  reopen(
    @Param('id') id: string,
    @Body() dto: ReopenTestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reopenForStudent(id, dto, user.id);
  }
}
