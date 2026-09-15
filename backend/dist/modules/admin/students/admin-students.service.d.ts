import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListStudentsQueryDto, AdjustScoreDto } from './dto/admin-students.dto';
export declare class AdminStudentsService {
    private readonly prisma;
    private readonly audit;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, audit: AuditService, eventEmitter: EventEmitter2);
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
    getDetail(studentId: string): Promise<{
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
    setBlocked(studentId: string, blocked: boolean, actorId: string): Promise<{
        id: string;
        status: string;
    }>;
    adjustScore(studentId: string, dto: AdjustScoreDto, actorId: string): Promise<{
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
