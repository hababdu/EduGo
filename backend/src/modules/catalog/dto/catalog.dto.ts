import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CatalogQueryDto {
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsNumberString() minRating?: string;
  @IsOptional() @IsIn(['rating', 'newest', 'name']) sort?: 'rating' | 'newest' | 'name';
  @IsOptional() @IsNumberString() page?: string;
}
export class ReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}
export class ProfileDto {
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(1000) about?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string;
}
