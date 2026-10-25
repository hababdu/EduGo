import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SubmitHomeworkDto {
  @IsOptional() @IsString() @MaxLength(10000)
  textAnswer?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(40, { each: true })
  fileIds?: string[];
}

export class ReviewSubmissionDto {
  @IsInt() @Min(0) @Max(1000)
  score: number;

  @IsOptional() @IsString() @MaxLength(2000)
  feedback?: string;
}

export class ReturnSubmissionDto {
  @IsString() @MinLength(3, { message: "Nimani tuzatish kerakligini yozing" }) @MaxLength(2000)
  note: string;
}
