import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TestSessionService } from './test-session.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('api/v1/tests/:testId')
export class TestSessionController {
  constructor(private readonly sessionService: TestSessionService) {}

  @Post('start')
  start(@Param('testId') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sessionService.start(testId, user.id);
  }

  @Post('answer')
  saveAnswer(
    @Param('testId') testId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.sessionService.saveAnswer(testId, user.id, dto);
  }

  @Get('session')
  getSession(@Param('testId') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sessionService.getSession(testId, user.id);
  }

  @Post('submit')
  submit(@Param('testId') testId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sessionService.submit(testId, user.id);
  }
}
