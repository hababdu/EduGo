import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getMyDashboard(user: CurrentUserPayload): Promise<{
        student: {
            firstName: string;
            profilePhotoUrl: string | null;
            streak: number;
            rank: number;
        };
        continueLesson: {
            subjectId: string;
            subjectTitle: string;
            progressPercent: number;
        } | null;
        subjects: {
            id: string;
            title: string;
            posterUrl: string | null;
            progressPercent: number;
        }[];
        stats: {
            totalScore: number;
            xp: number;
            level: number;
            xpIntoLevel: number;
            xpForNextLevel: number;
        };
        recentResults: {
            testTitle: string;
            percent: number;
            passed: boolean;
        }[];
        achievements: {
            id: string;
            title: string;
            iconUrl: string | null;
        }[];
    }>;
}
