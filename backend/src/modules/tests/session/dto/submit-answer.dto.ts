import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAnswerDto {
  @IsString() @MaxLength(40) questionId: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(40, { each: true })
  selectedOptionIds?: string[];

  @IsOptional() @IsString() @MaxLength(5000) textAnswer?: string;
}
