// src/modules/teacher/dto/teacher-assignments.dto.ts
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const CONTENT_TYPES = ['TEXT', 'IMAGE', 'PDF', 'VIDEO', 'FILE'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED'] as const;
const CATEGORIES = ['LESSON', 'HOMEWORK', 'RESOURCE'] as const;

export class AssignmentTestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  correctOption: number;
}

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(CONTENT_TYPES)
  type: (typeof CONTENT_TYPES)[number];

  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^(https?:\/\/\S+)?$/i, { message: 'Havola faqat http(s):// bilan boshlansin' })
  mediaUrl?: string;

  /** Bitta guruh (eski mijozlar uchun) — yoki groupIds */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  groupId?: string;

  /** Bir nechta guruhga bir vaqtda biriktirish */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  groupIds?: string[];

  /** Oldindan yuklangan fayllar (POST /api/v1/materials/files) */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AssignmentTestDto)
  tests?: AssignmentTestDto[];
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(CONTENT_TYPES)
  type?: (typeof CONTENT_TYPES)[number];

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^(https?:\/\/\S+)?$/i, { message: 'Havola faqat http(s):// bilan boshlansin' })
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  groupId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AssignmentTestDto)
  tests?: AssignmentTestDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  /** null/bo'sh = muddatni olib tashlash */
  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;
}
