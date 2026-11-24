import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateFeatureDto {
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceMonthly?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
