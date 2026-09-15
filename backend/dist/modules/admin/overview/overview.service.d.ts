import { PrismaService } from '../../../prisma/prisma.service';
export declare class OverviewService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        totals: {
            students: number;
            activeStudents: number;
            teachers: number;
            courses: number;
            subjects: number;
            tests: number;
            completedTests: number;
            totalScoreIssued: number;
        };
        today: {
            testAttempts: number;
        };
        charts: {
            dailyActiveUsers: {
                date: string;
                count: number;
            }[];
        };
    }>;
    private getDailyActiveUsersLast7Days;
}
