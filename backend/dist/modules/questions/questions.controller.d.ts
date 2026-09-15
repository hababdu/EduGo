import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, QuestionFilterDto } from './dto/question.dto';
export declare class QuestionsController {
    private readonly questionsService;
    constructor(questionsService: QuestionsService);
    list(filter: QuestionFilterDto): Promise<({
        options: {
            id: string;
            order: number;
            text: string;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        subjectId: string | null;
        topicId: string | null;
        createdById: string;
        type: import(".prisma/client").$Enums.QuestionType;
        text: string;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        explanation: string | null;
        points: number;
        tags: string[];
    })[]>;
    getOne(id: string): Promise<{
        options: {
            id: string;
            order: number;
            text: string;
            isCorrect: boolean;
            questionId: string;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        subjectId: string | null;
        topicId: string | null;
        createdById: string;
        type: import(".prisma/client").$Enums.QuestionType;
        text: string;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        explanation: string | null;
        points: number;
        tags: string[];
    }>;
    create(dto: CreateQuestionDto, user: CurrentUserPayload): Promise<{
        options: {
            id: string;
            order: number;
            text: string;
            isCorrect: boolean;
            questionId: string;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        subjectId: string | null;
        topicId: string | null;
        createdById: string;
        type: import(".prisma/client").$Enums.QuestionType;
        text: string;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        explanation: string | null;
        points: number;
        tags: string[];
    }>;
    remove(id: string): Promise<void>;
}
