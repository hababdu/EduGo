import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, QuestionFilterDto } from './dto/question.dto';

@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
@Controller('api/v1/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  list(@Query() filter: QuestionFilterDto) {
    return this.questionsService.list(filter);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.questionsService.getFullForEditing(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.questionsService.create(dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}
