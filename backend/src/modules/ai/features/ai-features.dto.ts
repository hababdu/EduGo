// src/modules/ai/features/ai-features.dto.ts
//
// main.ts da ValidationPipe({ whitelist, forbidNonWhitelisted }) yoqilgan, shuning uchun
// har bir maydonga dekorator kerak va ortiqcha maydon yuborilsa 400 qaytadi.
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DIFF = ['EASY', 'MEDIUM', 'HARD', 'MIXED'] as const;

export class GenerateMaterialDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  topic: string;

  @IsIn(['LESSON', 'HOMEWORK', 'RESOURCE'])
  category: 'LESSON' | 'HOMEWORK' | 'RESOURCE';
}

export class GenerateQuestionsDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  topic: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(30)
  count: number;

  @IsIn(DIFF)
  difficulty: (typeof DIFF)[number];
}

export class GenerateSingleQuestionDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  topic: string;

  @IsIn(DIFF)
  difficulty: (typeof DIFF)[number];

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(500, { each: true })
  avoidTexts?: string[];
}

export class GradeAnswerDto {
  @IsString() @IsNotEmpty() @MaxLength(1000)
  question: string;

  @IsString() @IsNotEmpty() @MaxLength(4000)
  studentAnswer: string;

  @IsOptional() @IsString() @MaxLength(2000)
  referenceAnswer?: string;
}

export class TopicResultDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  topic: string;

  @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  scorePercent: number;
}

export class RecommendationsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => TopicResultDto)
  results: TopicResultDto[];
}

export class LessonPlanDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  topic: string;

  @Type(() => Number) @IsInt() @Min(10) @Max(180)
  durationMinutes: number;

  @IsOptional() @IsString() @MaxLength(50)
  level?: string;
}

export class ParentMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  studentName: string;

  @IsString() @IsNotEmpty() @MaxLength(1000)
  context: string;

  @IsOptional() @IsIn(['IJOBIY', 'OGOHLANTIRISH', 'NEYTRAL'])
  tone?: 'IJOBIY' | 'OGOHLANTIRISH' | 'NEYTRAL';
}

/** studentName ATAYLAB yo'q: server uni bazadan (JWT dagi foydalanuvchidan) oladi. */
export class MascotDto {
  @IsIn(['DASHBOARD_CHECKIN', 'TEST_RESULT', 'INACTIVITY'])
  event: 'DASHBOARD_CHECKIN' | 'TEST_RESULT' | 'INACTIVITY';

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  percent?: number;

  @IsOptional() @IsBoolean()
  passed?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  streak?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  recentFailCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650)
  daysSinceLastActivity?: number;
}

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString() @IsNotEmpty() @MaxLength(4000)
  content: string;
}

/** system prompt mijozdan QABUL QILINMAYDI (aks holda har kim AI'ni erkin chat sifatida ishlata olardi). */
export class ChatDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChatMessageDto)
  history: ChatMessageDto[];
}

export class TutorChatDto extends ChatDto {
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(100, { each: true })
  weakTopics?: string[];
}
