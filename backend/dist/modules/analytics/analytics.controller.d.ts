import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
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
    getQuestionAnalytics(testId: string): Promise<{
        questionId: string;
        questionText: string;
        totalAnswered: number;
        correctCount: number;
        wrongCount: number;
        accuracyPercent: number | null;
    }[]>;
}
