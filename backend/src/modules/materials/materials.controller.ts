import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { MAX_UPLOAD_BYTES } from './material-file.util';
import { MaterialsService } from './materials.service';

@Controller('api/v1/materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    return this.materials.upload(user, file);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')
  @Get('files/:id/content')
  async content(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const { file, buffer, inline } = await this.materials.content(user, id);
    const encoded = encodeURIComponent(file.fileName);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encoded}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(buffer);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('files/:id/send-to-chat')
  sendToChat(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.materials.sendToChat(user, id);
  }

  @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
  @Delete('files/:id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.materials.remove(user, id);
  }
}
