import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';
export declare class RankingController {
    private readonly rankingService;
    constructor(rankingService: RankingService);
    getGlobal(limit: string, user: CurrentUserPayload): Promise<{
        top: import("./ranking.service").RankingEntry[];
        yourRank: number;
    }>;
    getGroup(groupId: string): Promise<{
        top: import("./ranking.service").RankingEntry[];
    }>;
    getSubject(subjectId: string): Promise<{
        top: import("./ranking.service").RankingEntry[];
    }>;
}
