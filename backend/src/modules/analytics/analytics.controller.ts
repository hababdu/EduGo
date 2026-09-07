import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tests/:testId')
  getTestAnalytics(@Param('testId') testId: string) {
    return this.analyticsService.getTestAnalytics(testId);
  }

  @Get('tests/:testId/questions')
  getQuestionAnalytics(@Param('testId') testId: string) {
    return this.analyticsService.getQuestionAnalyticsForTest(testId);
  }
}
