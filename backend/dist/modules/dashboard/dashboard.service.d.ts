import { PrismaService } from '../../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStudentDashboard(userId: string): Promise<{
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
