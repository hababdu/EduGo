import { PrismaService } from '../../prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTestAnalytics(testId: string): Promise<{
        testTitle: string;
        participants: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
        averageTimeSeconds: number;
        passRate: number;
        failRate: number;
    }>;
    getQuestionAnalyticsForTest(testId: string): Promise<{
        questionId: string;
        questionText: string;
        totalAnswered: number;
        correctCount: number;
        wrongCount: number;
        accuracyPercent: number | null;
    }[]>;
}
