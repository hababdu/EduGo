import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListStudentsQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // ism/username bo'yicha

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'BLOCKED', 'PENDING'])
  status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 20;
}

export class AdjustScoreDto {
  @Type(() => Number)
  @IsInt()
  amount: number; // musbat = qo'shish, manfiy = ayirish

  @IsString()
  @IsNotEmpty()
  reason: string; // audit log uchun majburiy izoh
}
