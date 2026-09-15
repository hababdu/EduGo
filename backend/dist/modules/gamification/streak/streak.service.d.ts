import { PrismaService } from '../../../prisma/prisma.service';
export declare class StreakService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordActivity(studentId: string): Promise<{
        id: string;
        studentId: string;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: Date | null;
    }>;
    getStreak(studentId: string): import(".prisma/client").Prisma.Prisma__StreakClient<{
        id: string;
        studentId: string;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
}
