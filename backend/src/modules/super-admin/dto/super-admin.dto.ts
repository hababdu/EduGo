import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class CreateOrgDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateOrgDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: 'ACTIVE' | 'SUSPENDED';
}

export class AssignAdminDto {
  /** Ro'yxatdan tanlangan foydalanuvchi */
  @IsString() @MinLength(5) @MaxLength(40) userId!: string;
}

export class UserSearchDto {
  @IsOptional() @IsString() @MaxLength(60) search?: string;
}

class LimitsDto {
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) STUDENT?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) TEACHER?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) ADMIN?: number;
}

export class UpdateAiDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @ValidateNested() @Type(() => LimitsDto) limits?: LimitsDto;
}

export class AuditQueryDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
}
