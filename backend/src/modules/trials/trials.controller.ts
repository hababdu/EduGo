import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequestTrialDto } from './dto/request-trial.dto';
import { ReviewTrialDto } from './dto/review-trial.dto';
import { TrialAttendanceDto } from './dto/attendance.dto';
import { TrialsService } from './trials.service';

@Controller('trials')
export class TrialsController {
  constructor(private readonly trials: TrialsService) {}

  @Get('me') listMine(@CurrentUser() user: CurrentUserPayload) { return this.trials.listMine(user.id); }

  @Post('schools/:organizationId')
  request(@CurrentUser() user: CurrentUserPayload, @Param('organizationId') organizationId: string, @Body() dto: RequestTrialDto) {
    return this.trials.request(user.id, organizationId, dto.groupId, dto.scheduledAt, dto.note);
  }

  @Patch(':trialId/review')
  review(@CurrentUser() user: CurrentUserPayload, @Param('trialId') trialId: string, @Body() dto: ReviewTrialDto) {
    return this.trials.review(user.id, trialId, dto);
  }

  @Patch(':trialId/attendance')
  attendance(@CurrentUser() user: CurrentUserPayload, @Param('trialId') trialId: string, @Body() dto: TrialAttendanceDto) {
    return this.trials.markAttendance(user.id, trialId, dto.attended);
  }

  @Patch(':trialId/cancel') cancel(@CurrentUser() user: CurrentUserPayload, @Param('trialId') trialId: string) {
    return this.trials.cancel(user.id, trialId);
  }
}
