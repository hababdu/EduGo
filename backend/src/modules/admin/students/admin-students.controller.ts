import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AdminStudentsService } from './admin-students.service';
import { ListStudentsQueryDto, AdjustScoreDto } from './dto/admin-students.dto';

@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/admin/students')
export class AdminStudentsController {
  constructor(private readonly service: AdminStudentsService) {}

  @Get()
  list(@Query() query: ListStudentsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id/block')
  block(@Param('id') id: string, @CurrentUser() actor: CurrentUserPayload) {
    return this.service.setBlocked(id, true, actor.id);
  }

  @Patch(':id/unblock')
  unblock(@Param('id') id: string, @CurrentUser() actor: CurrentUserPayload) {
    return this.service.setBlocked(id, false, actor.id);
  }

  @Patch(':id/score')
  adjustScore(
    @Param('id') id: string,
    @Body() dto: AdjustScoreDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.service.adjustScore(id, dto, actor.id);
  }
}
