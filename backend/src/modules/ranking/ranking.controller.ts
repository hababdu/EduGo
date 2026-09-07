import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';

@Controller('api/v1/ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('global')
  async getGlobal(@Query('limit') limit: string, @CurrentUser() user: CurrentUserPayload) {
    const [top, yourRank] = await Promise.all([
      this.rankingService.getGlobalRanking(limit ? Number(limit) : 20),
      this.rankingService.getStudentRank(user.id),
    ]);
    return { top, yourRank };
  }

  @Get('group/:groupId')
  async getGroup(@Param('groupId') groupId: string) {
    const top = await this.rankingService.getGroupRanking(groupId);
    return { top };
  }

  @Get('subject/:subjectId')
  async getSubject(@Param('subjectId') subjectId: string) {
    const top = await this.rankingService.getSubjectRanking(subjectId);
    return { top };
  }
}
