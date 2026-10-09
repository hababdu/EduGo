// src/modules/groups/dto/groups.dto.ts
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
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
export const MAX_MONEY = 100_000_000; // so'm
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Dars jadvali maydonlari (create/update uchun umumiy) */
export class ScheduleFields {
  /** ISO hafta kunlari: 1=Dushanba … 7=Yakshanba */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true, message: "Hafta kuni 1 (Dushanba) dan 7 (Yakshanba) gacha bo'lsin" })
  @Max(7, { each: true, message: "Hafta kuni 1 (Dushanba) dan 7 (Yakshanba) gacha bo'lsin" })
  lessonDays?: number[];

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "Boshlanish vaqti HH:mm ko'rinishida bo'lsin" })
  lessonStartTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "Tugash vaqti HH:mm ko'rinishida bo'lsin" })
  lessonEndTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Xona nomi 60 ta belgidan oshmasin' })
  room?: string | null;

  @IsOptional()
  @IsInt({ message: "Oylik to'lov butun son bo'lsin (so'm)" })
  @Min(0, { message: "Oylik to'lov manfiy bo'lmasin" })
  @Max(MAX_MONEY, { message: `Oylik to'lov ${MAX_MONEY} dan oshmasin` })
  monthlyFee?: number | null;
}

/* ============================================================
   CREATE GROUP
   ============================================================ */
export class CreateGroupDto extends ScheduleFields {
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
  @Matches(/^((https?:\/\/|\/uploads\/)\S+)?$/i, { message: 'Havola faqat http(s):// bilan boshlansin' })
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
export class UpdateGroupDto extends ScheduleFields {
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