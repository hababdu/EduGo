import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateOrgDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  /** Maktabning yopiq Telegram kanali (-100…). Bot unda admin bo'lishi shart. */
  @IsString() @Matches(/^-100\d{5,}$/, { message: "Kanal ID -100 bilan boshlanishi kerak" }) storageChatId!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateOrgDto {
  @IsOptional() @IsString() @Matches(/^-100\d{5,}$/, { message: "Kanal ID -100 bilan boshlanishi kerak" }) storageChatId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: 'ACTIVE' | 'SUSPENDED';
  /** Maktabning oylik obuna to'lovi (so'm); null — belgilanmagan */
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000) monthlyPlanFee?: number | null;
}

export class MarkOrgPaymentDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @IsIn(['PAID', 'WAIVED', 'UNPAID']) status!: 'PAID' | 'WAIVED' | 'UNPAID';
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000) amount?: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class AssignAdminDto {
  /** Ro'yxatdan tanlangan foydalanuvchi */
  @IsString() @MinLength(5) @MaxLength(40) userId!: string;
}

export class MoveAdminDto {
  @IsString() @MinLength(5) @MaxLength(40) organizationId!: string;
}

export class UserSearchDto {
  @IsOptional() @IsString() @MaxLength(60) search?: string;
}

class LimitsDto {
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) STUDENT?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) TEACHER?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) ADMIN?: number;
}

const MODEL_RE = /^[A-Za-z0-9._\-\/:]{0,80}$/;

export class ProviderModelsDto {
  @IsOptional() @IsString() @Matches(MODEL_RE) fast?: string;
  @IsOptional() @IsString() @Matches(MODEL_RE) smart?: string;
}

export class ModelsDto {
  @IsOptional() @ValidateNested() @Type(() => ProviderModelsDto) anthropic?: ProviderModelsDto;
  @IsOptional() @ValidateNested() @Type(() => ProviderModelsDto) groq?: ProviderModelsDto;
  @IsOptional() @ValidateNested() @Type(() => ProviderModelsDto) gemini?: ProviderModelsDto;
}

export class UpdateAiDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @ValidateNested() @Type(() => LimitsDto) limits?: LimitsDto;
  @IsOptional() @IsIn(['anthropic', 'groq', 'gemini']) primary?: 'anthropic' | 'groq' | 'gemini';
  /** 'none' — zaxira provayder yo'q */
  @IsOptional() @IsIn(['anthropic', 'groq', 'gemini', 'none']) fallback?: 'anthropic' | 'groq' | 'gemini' | 'none';
  @IsOptional() @ValidateNested() @Type(() => ModelsDto) models?: ModelsDto;
}

export class AuditQueryDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
}
