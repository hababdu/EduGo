import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerOptionInput {
  @IsString() @IsNotEmpty() text: string;
  @IsBoolean() isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'TEXT_ANSWER'])
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT_ANSWER';

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsString() @IsNotEmpty() text: string;

  @IsOptional() @IsString() explanation?: string;

  @IsOptional() @IsInt() points?: number;

  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() topicId?: string;

  @IsOptional() @IsArray() tags?: string[];

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionInput)
  options: AnswerOptionInput[];
}

export class QuestionFilterDto {
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
}
