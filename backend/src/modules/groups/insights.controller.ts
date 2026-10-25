import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('finance')
  finance(@Query('months') months: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return this.insights.finance(u, months ? Number(months) : undefined);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('at-risk')
  atRisk(@CurrentUser() u: CurrentUserPayload) {
    return this.insights.atRisk(u);
  }
}
