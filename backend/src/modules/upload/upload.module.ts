import { Module } from '@nestjs/common';
import { MaterialsModule } from '../materials/materials.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [MaterialsModule],
  controllers: [UploadController],
})
export class UploadModule {}
