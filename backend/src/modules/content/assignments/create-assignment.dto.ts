import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string; // TEXT, IMAGE, PDF, VIDEO

  @IsString()
  @IsNotEmpty()
  category: string; // LESSON, HOMEWORK, RESOURCE

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsNotEmpty()
  groupId: string; // Qaysi guruhga tegishliligi
}