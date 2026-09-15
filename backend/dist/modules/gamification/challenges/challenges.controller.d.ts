import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/challenge.dto';
export declare class ChallengesController {
    private readonly challengesService;
    constructor(challengesService: ChallengesService);
    getToday(user: CurrentUserPayload): Promise<{
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
}
