import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

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
  @IsOptional() @IsString() @MaxLength(500) posterUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) @Matches(/^https:\/\//i, { message: 'Sayt havolasi https:// bilan boshlansin' }) websiteUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) @Matches(/^https:\/\/(t\.me|telegram\.me)\//i, { message: 'Telegram havolasi t.me bilan boshlansin' }) telegramUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) @Matches(/^https:\/\//i, { message: 'Instagram havolasi https:// bilan boshlansin' }) instagramUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string;
}
