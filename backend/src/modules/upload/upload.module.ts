// src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { PexelsService } from './pexels.service';

@Module({
  controllers: [UploadController],
  providers: [PexelsService],
})
export class UploadModule {}