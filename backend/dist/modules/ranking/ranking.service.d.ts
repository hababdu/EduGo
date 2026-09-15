import { PrismaService } from '../../prisma/prisma.service';
export interface RankingEntry {
    studentId: string;
    firstName: string;
    username: string | null;
    totalScore: number;
    rank: number;
}
export declare class RankingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getGlobalRanking(limit?: number): Promise<RankingEntry[]>;
    getGroupRanking(groupId: string, limit?: number): Promise<RankingEntry[]>;
    getSubjectRanking(subjectId: string, limit?: number): Promise<RankingEntry[]>;
    getStudentRank(studentId: string): Promise<number>;
    private rankProfiles;
}
