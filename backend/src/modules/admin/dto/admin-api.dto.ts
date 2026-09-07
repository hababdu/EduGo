import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterStudentsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  group_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;
}

export class AdjustScoreDto {
  @IsNumber()
  amount: number;

  @IsString()
  reason: string;
}

export class AssignGroupDto {
  @IsOptional()
  @IsString()
  groupId: string | null;
}

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsString()
  code: string;
}

export class AssignTeacherSubjectDto {
  @IsString()
  subjectId: string;
}

export class UpdateUserRoleDto {
  @IsEnum(['STUDENT', 'TEACHER', 'ADMIN'])
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}