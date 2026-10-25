import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'TRIAL', 'ENROLLED', 'LOST'] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  @IsOptional() @IsString() @MaxLength(100) interest?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsDateString() nextContactAt?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  @IsOptional() @IsString() @MaxLength(100) interest?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsIn(LEAD_STATUSES as unknown as string[], { message: "Holat noto'g'ri" }) status?: LeadStatusValue;
  /** null yuborilsa — qayta aloqa sanasi o'chiriladi */
  @IsOptional() @IsDateString() nextContactAt?: string | null;
}
