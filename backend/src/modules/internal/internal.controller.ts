import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { InternalService } from './internal.service';

/**
 * @Public() — chunki bu yerda oddiy JWT (user tokeni) yo'q,
 * lekin @UseGuards(InternalAuthGuard) orqali BOSHQA, alohida
 * himoya qatlami ishlatiladi (server-to-server sirli kalit).
 * Ya'ni bu endpointlar "ochiq" emas — faqat boshqacha usulda himoyalangan.
 */
@Public()
@UseGuards(InternalAuthGuard)
@Controller('api/v1/internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('students/by-telegram/:telegramId/summary')
  getSummary(@Param('telegramId') telegramId: string) {
    return this.internalService.getStudentSummary(telegramId);
  }

  @Get('students/by-telegram/:telegramId/results')
  getResults(
    @Param('telegramId') telegramId: string,
    @Query('limit') limit?: string,
  ) {
    return this.internalService.getRecentResults(
      telegramId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('students/by-telegram/:telegramId/achievements')
  getAchievements(@Param('telegramId') telegramId: string) {
    return this.internalService.getAchievements(telegramId);
  }

  @Get('ranking/top')
  getTopRanking(@Query('limit') limit?: string) {
    return this.internalService.getTopRanking(limit ? Number(limit) : undefined);
  }

  @Get('announcements')
  getAnnouncements(@Query('limit') limit?: string) {
    return this.internalService.getRecentAnnouncements(
      limit ? Number(limit) : undefined,
    );
  }
}
