import { IsIn, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SchoolSearchDto {
  @IsOptional() @IsString() @MaxLength(60) search?: string;
}

export class JoinRequestDto {
  @IsString() @MinLength(5) @MaxLength(40) organizationId!: string;
  /** Qo'shilish so'rovida faqat o'quvchi yoki o'qituvchi bo'lish mumkin; admin faqat tayinlanadi */
  @IsOptional() @IsIn(['STUDENT', 'TEACHER']) role?: 'STUDENT' | 'TEACHER';
  @IsOptional() @IsString() @MaxLength(300) message?: string;
}

export class MembersQueryDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
  @IsOptional() @IsIn(['PENDING', 'ACTIVE', 'REJECTED', 'REMOVED']) status?: string;
  @IsOptional() @IsIn(['STUDENT', 'TEACHER', 'ADMIN']) role?: string;
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @IsNumberString() page?: string;
}

export class DecideDto {
  /** Tasdiqlashda rol (ko'rsatilmasa — so'rovdagi rol) */
  @IsOptional() @IsIn(['STUDENT', 'TEACHER', 'ADMIN']) role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export class MemberRoleDto {
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN']) role!: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export class AttachDto {
  @IsString() @MinLength(5) @MaxLength(40) userId!: string;
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN']) role!: 'STUDENT' | 'TEACHER' | 'ADMIN';
  /** Faqat SUPER_ADMIN uchun; maktab admini o'z maktabiga biriktiradi */
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) organizationId?: string;
}
