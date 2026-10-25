import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Oylik hisobot (Excel): to'lovlar va davomat. Faqat admin. */
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('monthly')
  async monthly(@Query('month') month: string | undefined, @CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const { buffer, fileName } = await this.reports.monthlyXlsx(user, month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }
}
