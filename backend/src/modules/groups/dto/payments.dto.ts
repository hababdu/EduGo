import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_MONEY } from './groups.dto';

export const PAYMENT_MARKS = ['PAID', 'WAIVED', 'UNPAID'] as const;
export type PaymentMark = (typeof PAYMENT_MARKS)[number];

export class PaymentEntryDto {
  @IsString()
  @MaxLength(64)
  studentId: string;

  @IsIn(PAYMENT_MARKS as unknown as string[], { message: "Holat noto'g'ri (PAID, WAIVED yoki UNPAID)" })
  status: PaymentMark;

  /** So'm. Berilmasa va guruhda oylik to'lov belgilangan bo'lsa — shu summa olinadi. */
  @IsOptional()
  @IsInt({ message: "Summa butun son bo'lsin" })
  @Min(0)
  @Max(MAX_MONEY)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class MarkPaymentsDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Oy YYYY-MM ko'rinishida bo'lsin" })
  month: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PaymentEntryDto)
  records: PaymentEntryDto[];
}
