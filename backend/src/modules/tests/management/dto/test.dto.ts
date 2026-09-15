// src/modules/tests/management/dto/test.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/* ============================================================
   QUESTION DRAFT (test bilan birga yaratish uchun)
   ============================================================ */
export class QuestionDraftDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  points: number;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  correctAnswerIndex: number;
}

/* ============================================================
   CREATE TEST (subjectId YO'Q, groupId BOR)
   ============================================================ */
export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ❌ subjectId OLIB TASHLANDI

  @IsOptional()
  @IsString()
  topicId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  durationSeconds: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  passingScore: number;

  @IsOptional()
  @IsBoolean()
  randomQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  randomAnswerOrder?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  questionCount?: number;

  // 👇 Test yaratilganda biriktiriladigan guruhlar
  @IsArray()
  @ArrayMinSize(1, { message: 'Kamida 1 ta guruh tanlanishi kerak' })
  @IsString({ each: true })
  groupIds: string[];

  // 👇 Ixtiyoriy: bankdan savollar
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionIds?: string[];

  // 👇 Yangi savollar (bankka saqlanadi)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuestionDraftDto)
  questions?: QuestionDraftDto[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/* ============================================================
   ASSIGN TEST
   ============================================================ */
export class AssignTestDto {
  @IsIn(['ALL', 'GROUP', 'INDIVIDUAL'])
  targetType: 'ALL' | 'GROUP' | 'INDIVIDUAL';

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

/* ============================================================
   REOPEN TEST
   ============================================================ */
export class ReopenTestDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;
}