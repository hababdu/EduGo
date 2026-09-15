import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AdminStudentsService } from './admin-students.service';
import { ListStudentsQueryDto, AdjustScoreDto } from './dto/admin-students.dto';
export declare class AdminStudentsController {
    private readonly service;
    constructor(service: AdminStudentsService);
    list(query: ListStudentsQueryDto): Promise<{
        items: {
            id: string;
            firstName: string;
            lastName: string | null;
            username: string | null;
            status: import(".prisma/client").$Enums.AccountStatus;
            registeredAt: Date;
            lastActiveAt: Date;
            totalScore: number;
            level: number;
        }[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    }>;
    getDetail(id: string): Promise<{
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
        groupMemberships: ({
            group: {
                id: string;
                deletedAt: Date | null;
                name: string;
                description: string | null;
                teacherId: string | null;
                assistantId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            description: string | null;
            groupId: string;
            studentId: string;
            joinedAt: Date;
        })[];
        achievements: ({
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
        })[];
        testAttempts: ({
            test: {
                title: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AttemptStatus;
            studentId: string;
            testId: string;
            sessionId: string;
            score: number;
            maxScore: number;
            percent: number;
            passed: boolean;
            timeSpentSeconds: number;
            isRetakeAllowed: boolean;
            completedAt: Date;
        })[];
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
    block(id: string, actor: CurrentUserPayload): Promise<{
        id: string;
        status: string;
    }>;
    unblock(id: string, actor: CurrentUserPayload): Promise<{
        id: string;
        status: string;
    }>;
    adjustScore(id: string, dto: AdjustScoreDto, actor: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        studentId: string;
        testId: string | null;
        subjectId: string | null;
        createdById: string | null;
        amount: number;
        type: import(".prisma/client").$Enums.ScoreTransactionType;
    }>;
}
