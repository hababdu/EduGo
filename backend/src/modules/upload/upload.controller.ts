// src/modules/upload/upload.controller.ts
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'groups');

          // ✅ HAR SAFAR papka mavjudligini tekshirish va yaratish
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
            console.log(`[upload] ✅ Papka yaratildi: ${uploadPath}`);
          }

          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const uniqueName = randomBytes(16).toString('hex');
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uniqueName}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Faqat rasm fayllar (jpg, png, webp, gif) qabul qilinadi',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fayl tanlanmagan');
    }

    return {
      url: `/uploads/groups/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}