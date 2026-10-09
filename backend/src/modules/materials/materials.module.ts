import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialContextService } from './material-context.service';
import { MaterialsService } from './materials.service';
import { TelegramStorageService } from './telegram-storage.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, MaterialContextService, TelegramStorageService],
  exports: [MaterialsService, MaterialContextService],
})
export class MaterialsModule {}
