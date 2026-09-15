import { OverviewService } from './overview.service';
export declare class OverviewController {
    private readonly overviewService;
    constructor(overviewService: OverviewService);
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
}
