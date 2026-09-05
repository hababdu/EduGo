import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { OverviewService } from './overview.service';

@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/v1/admin/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  getOverview() {
    return this.overviewService.getOverview();
  }
}
