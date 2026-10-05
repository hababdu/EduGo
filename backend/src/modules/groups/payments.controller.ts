import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { MarkPaymentsDto } from './dto/payments.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Admin: barcha guruhlar bo'yicha oylik xulosa + qarzdorlar */
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('overview')
  overview(@Query('month') month: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    return this.payments.overview(month, user);
  }

  /** O'quvchi: o'z to'lov holati (statik yo'l dinamikdan oldin) */
  @Roles('STUDENT')
  @Get('me/:groupId')
  me(@Param('groupId') groupId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.payments.myPayments(groupId, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('group/:groupId')
  group(
    @Param('groupId') groupId: string,
    @Query('month') month: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.payments.groupMonth(groupId, month, user);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('group/:groupId')
  mark(@Param('groupId') groupId: string, @Body() dto: MarkPaymentsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.payments.markMonth(groupId, dto, user);
  }
}
