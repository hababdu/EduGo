import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpsertLessonLogDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD ko\'rinishida bo\'lsin' })
  date: string;

  @IsString()
  @MinLength(2, { message: 'Mavzu kamida 2 belgi' })
  @MaxLength(300)
  topic: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homework?: string;
}
