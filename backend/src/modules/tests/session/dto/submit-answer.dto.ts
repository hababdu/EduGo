import { IsArray, IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString() questionId: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  selectedOptionIds?: string[];

  @IsOptional() @IsString() textAnswer?: string;
}
