// src/modules/upload/upload.controller.ts
import { BadRequestException, Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PexelsService } from './pexels.service';

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly pexelsService: PexelsService) {}

  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'posters');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new BadRequestException('Faqat JPG, PNG yoki WebP rasm yuklang'), false);
      cb(null, true);
    },
  }))
  uploadImage(@UploadedFile() file: { filename: string } | undefined) {
    if (!file) throw new BadRequestException('Rasm tanlanmadi');
    return { url: `/uploads/posters/${file.filename}` };
  }

  /* ============================================================
     PEXELS — rasm qidirish
     ============================================================ */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Get('search-photos')
  async searchPhotos(
    @Query('query') query: string,
    @Query('perPage') perPage?: string,
    @Query('page') page?: string,
  ) {
    return this.pexelsService.searchPhotos(
      query,
      Math.min(40, Math.max(1, Math.floor(Number(perPage)) || 24)),
      Math.min(50, Math.max(1, Math.floor(Number(page)) || 1)),
    );
  }
}