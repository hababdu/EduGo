import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Har doim TOKEN'dagi userId — :id qabul qilinmaydi, shuning uchun ownership muammosi umuman yo'q */
  @Get('me')
  async getMyDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getStudentDashboard(user.id);
  }
}
