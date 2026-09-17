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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  /**
   * POST /api/v1/upload/image
   * Form-data: { file: File }
   * Response: { url: '/uploads/groups/xxx.jpg', ... }
   */
  @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
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