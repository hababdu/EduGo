// src/modules/upload/upload.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PexelsService } from './pexels.service';

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly pexelsService: PexelsService) {}

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