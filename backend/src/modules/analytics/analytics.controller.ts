import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tests/:testId')
  getTestAnalytics(@Param('testId') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getTestAnalytics(testId, user);
  }

  @Get('tests/:testId/questions')
  getQuestionAnalytics(@Param('testId') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getQuestionAnalyticsForTest(testId, user);
  }
}
