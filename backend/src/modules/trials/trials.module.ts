import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { AdminTrialsController, TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';

@Module({ imports: [MembershipsModule], controllers: [TrialsController, AdminTrialsController], providers: [TrialsService] })
export class TrialsModule {}
