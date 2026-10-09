import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { AssignmentCategory, AssignmentType, TestQuestionDto } from './create-assignment.dto';

/**
 * `Partial<CreateAssignmentDto>` o'rniga HAQIQIY klass: tur (type) faqat kompilyatsiyada bor, ishga tushganda yo'q,
 * shuning uchun ValidationPipe uni tekshirmas va `teacherId` kabi maydonlarni to'g'ridan-to'g'ri yozish mumkin edi.
 */
export class UpdateAssignmentDto {
  @IsOptional() @IsString() @IsNotEmpty()
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(AssignmentType)
  type?: AssignmentType;

  @IsOptional() @IsEnum(AssignmentCategory)
  category?: AssignmentCategory;

  @IsOptional() @IsString() @MaxLength(1000)
  @Matches(/^(https?:\/\/\S+)?$/i, { message: 'Havola faqat http(s):// bilan boshlansin' })
  mediaUrl?: string;

  @IsOptional() @IsString() @IsNotEmpty()
  groupId?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TestQuestionDto)
  tests?: TestQuestionDto[];
}
