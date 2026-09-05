import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TestManagementService } from './test-management.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';

@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
@Controller('api/v1/tests')
export class TestManagementController {
  constructor(private readonly service: TestManagementService) {}

  @Post()
  create(@Body() dto: CreateTestDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.publish(id, user.id);
  }

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
