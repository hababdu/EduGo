import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestTrialDto {
  @IsString() @MinLength(1) groupId: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
