import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UsersModule } from './modules/users/users.module';
import { InternalModule } from './modules/internal/internal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { ContentModule } from './modules/content/content.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { TestsModule } from './modules/tests/tests.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env'ni yuklaydi
    EventEmitterModule.forRoot(), // score.changed kabi ichki eventlar uchun
    PrismaModule,
    AuthModule,
    GroupsModule,
    UsersModule,
    InternalModule,
    DashboardModule,
    AdminModule,
    TeacherModule,
    ContentModule,
    QuestionsModule,
    GamificationModule,
    TestsModule,
    RankingModule,
    // ... keyingi modullar shu yerga qo'shiladi (NotificationsModule va h.k.)
  ],
  providers: [
    // Guard'lar TARTIB bilan ishlaydi:
    // 1) JwtAuthGuard — avval kim ekanligini aniqlaydi (req.user'ni to'ldiradi)
    // 2) RolesGuard — keyin shu user.role @Roles()'ga mos keladimi tekshiradi
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
