import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TrialRequestDto {
  @IsString() @MinLength(5) @MaxLength(40) organizationId!: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) groupId?: string;
  /** Ota-ona uchun majburiy: bog'langan farzand */
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) studentId?: string;
  @IsOptional() @Type(() => Date) @IsDate() preferredAt?: Date;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
export class TrialQueryDto {
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string;
  @IsOptional() @IsIn(['REQUESTED', 'APPROVED', 'DECLINED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'ADMITTED']) status?: string;
  @IsOptional() @IsNumberString() page?: string;
}
export class TrialApproveDto {
  @Type(() => Date) @IsDate() scheduledAt!: Date;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
export class TrialNoteDto { @IsOptional() @IsString() @MaxLength(300) note?: string; }
export class TrialAdmitDto { @IsOptional() @IsString() @MinLength(5) @MaxLength(40) groupId?: string; }
