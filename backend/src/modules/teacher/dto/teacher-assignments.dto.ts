import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const CONTENT_TYPES = ['TEXT', 'IMAGE', 'PDF', 'VIDEO'] as const;
const CATEGORIES = ['LESSON', 'HOMEWORK', 'RESOURCE'] as const;

export class AssignmentTestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Kamida 2 ta variant kerak' })
  @ArrayMaxSize(6, { message: 'Maksimal 6 ta variant' })
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
  mediaUrl?: string;

  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maksimal 50 ta savol' })
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
}