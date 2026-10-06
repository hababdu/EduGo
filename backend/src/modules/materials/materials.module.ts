import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { TelegramStorageService } from './telegram-storage.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, TelegramStorageService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
