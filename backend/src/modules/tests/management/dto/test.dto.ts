import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() topicId?: string;

  @Type(() => Number) @IsInt() @Min(10)
  durationSeconds: number;

  @Type(() => Number) @IsInt() @Min(1)
  passingScore: number; // percent

  @IsOptional() @IsBoolean() randomQuestions?: boolean;
  @IsOptional() @IsBoolean() randomAnswerOrder?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() questionCount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds: string[]; // question bank'dan tanlangan savollar (fixed) yoki pool (random uchun)

  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

export class AssignTestDto {
  @IsIn(['ALL', 'GROUP', 'INDIVIDUAL'])
  targetType: 'ALL' | 'GROUP' | 'INDIVIDUAL';

  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() deadline?: string;
}

export class ReopenTestDto {
  @IsString() @IsNotEmpty() studentId: string;
}
