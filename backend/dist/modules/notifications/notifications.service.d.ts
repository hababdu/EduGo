import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
type NotificationType = 'TEST_ASSIGNED' | 'TEST_RESULT' | 'RANKING_CHANGE' | 'DEADLINE_REMINDER' | 'NEW_LESSON' | 'ANNOUNCEMENT' | 'SYSTEM';
export declare class NotificationsService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly botToken;
    constructor(prisma: PrismaService, configService: ConfigService);
    notify(userId: string, type: NotificationType, title: string, body: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        title: string;
        body: string;
        type: import(".prisma/client").$Enums.NotificationType;
        isRead: boolean;
        sentViaTelegram: boolean;
    }>;
    notifyMany(userIds: string[], type: NotificationType, title: string, body: string): Promise<void>;
    listForUser(userId: string, limit?: number): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        createdAt: Date;
        title: string;
        body: string;
        type: import(".prisma/client").$Enums.NotificationType;
        isRead: boolean;
        sentViaTelegram: boolean;
    }[]>;
    markAsRead(id: string, userId: string): Promise<void>;
    private sendViaTelegram;
}
export {};
