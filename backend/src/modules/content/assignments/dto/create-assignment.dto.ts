import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum AssignmentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  VIDEO = 'VIDEO',
}

export enum AssignmentCategory {
  LESSON = 'LESSON',
  HOMEWORK = 'HOMEWORK',
  RESOURCE = 'RESOURCE',
}

export class CreateAssignmentDto {
  @IsString({ message: 'Sarlavha matn ko\'rinishida bo\'lishi kerak' })
  @IsNotEmpty({ message: 'Sarlavha bo\'sh bo\'lishi mumkin emas' })
  title: string;

  @IsString({ message: 'Tafsilotlar matn ko\'rinishida bo\'lishi kerak' })
  @IsOptional()
  description?: string;

  @IsEnum(AssignmentType, { message: 'Noto\'g\'ri kontent formati tanlandi' })
  @IsNotEmpty({ message: 'Kontent formati ko\'rsatilishi shart' })
  type: AssignmentType;

  @IsEnum(AssignmentCategory, { message: 'Noto\'g\'ri material toifasi tanlandi' })
  @IsNotEmpty({ message: 'Material toifasi ko\'rsatilishi shart' })
  category: AssignmentCategory;

  @IsString({ message: 'Media URL matn ko\'rinishida bo\'lishi kerak' })
  @IsOptional()
  mediaUrl?: string;

  @IsString({ message: 'Guruh ID si matn ko\'rinishida bo\'lishi kerak' })
  @IsNotEmpty({ message: 'Guruh tanlanishi shart' })
  groupId: string;
}