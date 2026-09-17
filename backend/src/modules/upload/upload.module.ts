// src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // `uploads/groups/` papkasiga saqlash
          const uploadPath = join(process.cwd(), 'uploads', 'groups');
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const uniqueName = randomBytes(16).toString('hex');
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uniqueName}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}