// src/modules/groups/dto/groups.dto.ts
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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