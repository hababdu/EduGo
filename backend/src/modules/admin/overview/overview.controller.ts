import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OverviewService } from './overview.service';

@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/admin/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  getOverview(@CurrentUser() actor: CurrentUserPayload) {
    return this.overviewService.getOverview(actor);
  }
}
