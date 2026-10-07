// src/modules/ai/assistant/assistant.dto.ts
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { ChatMessageDto } from '../features/ai-features.dto';

export class AssistantChatDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChatMessageDto)
  history: ChatMessageDto[];

  /** Foydalanuvchi turgan sahifa (masalan `/teacher/tests/ckx...`). Faqat xavfsiz belgilar. */
  @IsOptional() @IsString() @MaxLength(120) @Matches(/^\/[A-Za-z0-9\-_/]*$/, { message: "page noto'g'ri formatda" })
  page?: string;
}
