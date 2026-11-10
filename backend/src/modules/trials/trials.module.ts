import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { AdminTrialsController, TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';

@Module({ imports: [MembershipsModule, NotificationsModule], controllers: [TrialsController, AdminTrialsController], providers: [TrialsService] })
export class TrialsModule {}
