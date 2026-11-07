import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { TeachingModule } from '../teaching/teaching.module';
import { PanelController } from './panel.controller';
import { PanelService } from './panel.service';

@Module({ imports: [MembershipsModule, TeachingModule], controllers: [PanelController], providers: [PanelService] })
export class PanelModule {}
