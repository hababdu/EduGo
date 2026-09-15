import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';
export declare class AchievementsController {
    private readonly achievementsService;
    constructor(achievementsService: AchievementsService);
    listAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        code: string;
        iconUrl: string | null;
    }[]>;
    listMine(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<({
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
}
