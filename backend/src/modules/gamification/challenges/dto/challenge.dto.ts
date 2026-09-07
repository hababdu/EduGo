import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChallengeDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() testId: string;
  @IsString() @IsNotEmpty() date: string; // ISO date, masalan "2026-09-08"

  @Type(() => Number) @IsInt() @Min(0)
  rewardScore: number;

  @Type(() => Number) @IsInt() @Min(0)
  rewardXp: number;
}
