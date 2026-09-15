import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChallengeDto } from './dto/challenge.dto';
export declare class ChallengesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getToday(studentId: string): Promise<{
        id: string;
        title: string;
        rewardScore: number;
        rewardXp: number;
        test: {
            id: string;
            title: string;
            durationSeconds: number;
        } | null;
        completed: boolean;
    } | null>;
    create(dto: CreateChallengeDto): import(".prisma/client").Prisma.Prisma__ChallengeClient<{
        id: string;
        createdAt: Date;
        testId: string | null;
        title: string;
        date: Date;
        rewardScore: number;
        rewardXp: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findActiveChallengeForTest(testId: string): Promise<{
        id: string;
        createdAt: Date;
        testId: string | null;
        title: string;
        date: Date;
        rewardScore: number;
        rewardXp: number;
    } | null>;
}
