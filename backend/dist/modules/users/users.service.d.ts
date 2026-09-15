import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfileFor(targetUserId: string, requester: CurrentUserPayload): Promise<{
        studentProfile: {
            id: string;
            totalScore: number;
            totalXp: number;
            level: number;
            bio: string | null;
            userId: string;
        } | null;
        streak: {
            id: string;
            studentId: string;
            currentStreak: number;
            longestStreak: number;
            lastActiveDate: Date | null;
        } | null;
    } & {
        id: string;
        telegramId: string;
        phone: string | null;
        username: string | null;
        firstName: string;
        lastName: string | null;
        profilePhotoUrl: string | null;
        role: import(".prisma/client").$Enums.RoleName;
        status: import(".prisma/client").$Enums.AccountStatus;
        registeredAt: Date;
        lastActiveAt: Date;
        deletedAt: Date | null;
    }>;
    findAllUsers(): Promise<{
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string;
        lastName: string | null;
        role: import(".prisma/client").$Enums.RoleName;
    }[]>;
    updateRole(userId: string, role: any): Promise<{
        id: string;
        telegramId: string;
        firstName: string;
        role: import(".prisma/client").$Enums.RoleName;
    }>;
}
