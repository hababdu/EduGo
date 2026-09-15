import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class AchievementsService implements OnModuleInit {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    listAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        code: string;
        iconUrl: string | null;
    }[]>;
    listForStudent(studentId: string): import(".prisma/client").Prisma.PrismaPromise<({
        achievement: {
            id: string;
            createdAt: Date;
            description: string | null;
            title: string;
            code: string;
            iconUrl: string | null;
        };
    } & {
        id: string;
        studentId: string;
        achievementId: string;
        earnedAt: Date;
    })[]>;
    checkAndAwardAfterTest(studentId: string, latestAttempt: {
        percent: number;
    }): Promise<void>;
    private awardIfNotAlready;
}
