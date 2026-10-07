import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'EXCUSED'] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export class AttendanceEntryDto {
  @IsString()
  @MaxLength(64)
  studentId: string;

  @IsIn(ATTENDANCE_STATUSES as unknown as string[], { message: "Holat noto'g'ri (PRESENT, ABSENT yoki EXCUSED)" })
  status: AttendanceStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class MarkAttendanceDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD ko\'rinishida bo\'lsin' })
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records: AttendanceEntryDto[];
}
