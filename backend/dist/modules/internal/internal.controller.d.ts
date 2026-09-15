import { InternalService } from './internal.service';
export declare class InternalController {
    private readonly internalService;
    constructor(internalService: InternalService);
    getSummary(telegramId: string): Promise<{
        firstName: string;
        totalScore: number;
        totalXp: number;
        level: number;
        rank: number;
        streak: number;
    }>;
    getResults(telegramId: string, limit?: string): Promise<({
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
    })[]>;
    getAchievements(telegramId: string): Promise<({
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
    getTopRanking(limit?: string): Promise<({
        user: {
            username: string | null;
            firstName: string;
        };
    } & {
        id: string;
        totalScore: number;
        totalXp: number;
        level: number;
        bio: string | null;
        userId: string;
    })[]>;
    getAnnouncements(limit?: string): Promise<{
        id: string;
        createdAt: Date;
        groupId: string | null;
        title: string;
        createdById: string;
        body: string;
        publishedOnTelegram: boolean;
    }[]>;
}
