import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    listMine(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        createdAt: Date;
        title: string;
        body: string;
        type: import(".prisma/client").$Enums.NotificationType;
        isRead: boolean;
        sentViaTelegram: boolean;
    }[]>;
    markAsRead(id: string, user: CurrentUserPayload): Promise<void>;
}
