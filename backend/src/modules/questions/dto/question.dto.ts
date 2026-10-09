import { ArrayMaxSize, ArrayMinSize, IsArray, Max, MaxLength, Min, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerOptionInput {
  @IsString() @IsNotEmpty() @MaxLength(1000) text: string;
  @IsBoolean() isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'TEXT_ANSWER'])
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT_ANSWER';

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsString() @IsNotEmpty() @MaxLength(3000) text: string;

  @IsOptional() @IsString() @MaxLength(3000) explanation?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100) points?: number;

  @IsOptional() @IsString() @MaxLength(40) subjectId?: string;
  @IsOptional() @IsString() @MaxLength(40) topicId?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(50, { each: true }) tags?: string[];

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionInput)
  options: AnswerOptionInput[];
}

export class QuestionFilterDto {
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
}
