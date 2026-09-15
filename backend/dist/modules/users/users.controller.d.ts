import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: CurrentUserPayload): Promise<{
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
    getAllUsers(user: CurrentUserPayload): Promise<{
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string;
        lastName: string | null;
        role: import(".prisma/client").$Enums.RoleName;
    }[]>;
    updateUserRole(id: string, role: string, user: CurrentUserPayload): Promise<{
        id: string;
        telegramId: string;
        firstName: string;
        role: import(".prisma/client").$Enums.RoleName;
    }>;
    getById(id: string, user: CurrentUserPayload): Promise<{
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
}
