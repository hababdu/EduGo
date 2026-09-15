import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto, QuestionFilterDto } from './dto/question.dto';
export declare class QuestionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    getFullForEditing(id: string): Promise<{
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
    create(dto: CreateQuestionDto, actorId: string): Promise<{
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
