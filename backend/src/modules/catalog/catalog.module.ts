import { Module } from '@nestjs/common';
import { CatalogController, SchoolProfileController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({ controllers: [CatalogController, SchoolProfileController], providers: [CatalogService] })
export class CatalogModule {}
