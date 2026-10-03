// src/modules/groups/dto/groups.dto.ts
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Faqat Telegram havolalari (javascript:, data: va h.k. o'tmasligi uchun qat'iy) */
export const TELEGRAM_URL_REGEX = /^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_+\/-]{3,100}$/;
export const GROUP_MAX_CAPACITY = 500;

/* ============================================================
   CREATE GROUP
   ============================================================ */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Guruh nomi kiritilishi shart' })
  @MaxLength(100, { message: 'Guruh nomi 100 ta belgidan oshmasin' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Tavsif 500 ta belgidan oshmasin' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Poster URL 1000 ta belgidan oshmasin' })
  posterUrl?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsInt({ message: "Sig'im butun son bo'lsin" })
  @Min(1, { message: "Sig'im kamida 1 bo'lsin" })
  @Max(GROUP_MAX_CAPACITY, { message: `Sig'im ${GROUP_MAX_CAPACITY} dan oshmasin` })
  maxCapacity?: number | null;

  @IsOptional()
  @IsString()
  @Matches(TELEGRAM_URL_REGEX, { message: "Havola https://t.me/... ko'rinishida bo'lsin" })
  telegramChatUrl?: string | null;
}

/* ============================================================
   UPDATE GROUP
   ============================================================ */
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  posterUrl?: string;

  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsOptional()
  @IsInt({ message: "Sig'im butun son bo'lsin" })
  @Min(1, { message: "Sig'im kamida 1 bo'lsin" })
  @Max(GROUP_MAX_CAPACITY, { message: `Sig'im ${GROUP_MAX_CAPACITY} dan oshmasin` })
  maxCapacity?: number | null;

  @IsOptional()
  @IsString()
  @Matches(TELEGRAM_URL_REGEX, { message: "Havola https://t.me/... ko'rinishida bo'lsin" })
  telegramChatUrl?: string | null;
}

/* ============================================================
   ADD STUDENT
   ============================================================ */
export class AddStudentDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;
}

/* ============================================================
   ASSIGN TEACHER
   ============================================================ */
export class AssignTeacherDto {
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}