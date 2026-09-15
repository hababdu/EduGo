import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TestManagementService } from './test-management.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';
export declare class TestManagementController {
    private readonly service;
    constructor(service: TestManagementService);
    listAssigned(user: CurrentUserPayload): Promise<{
        testId: string;
        title: string;
        durationSeconds: number;
        deadline: Date | null;
        status: "PENDING" | "COMPLETED" | "RETAKE_AVAILABLE";
        score: number | undefined;
        maxScore: number | undefined;
        passed: boolean | undefined;
    }[]>;
    list(subjectId: string, status: string, user: CurrentUserPayload): Promise<({
        subject: {
            title: string;
        } | null;
        _count: {
            assignments: number;
            questions: number;
            attempts: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.TestStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        maxScore: number;
        title: string;
        posterUrl: string | null;
        subjectId: string | null;
        order: number;
        topicId: string | null;
        durationSeconds: number;
        passingScore: number;
        randomQuestions: boolean;
        randomAnswerOrder: boolean;
        questionCount: number | null;
        teacherAssignmentId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    })[]>;
    getDetail(id: string, user: CurrentUserPayload): Promise<{
        assignments: ({
            group: {
                name: string;
            } | null;
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            groupId: string | null;
            studentId: string | null;
            testId: string;
            targetType: import(".prisma/client").$Enums.AssignmentTargetType;
            assignedById: string;
            assignedAt: Date;
            deadline: Date | null;
        })[];
        questions: ({
            question: {
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
            };
        } & {
            id: string;
            testId: string;
            order: number;
            questionId: string;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.TestStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        maxScore: number;
        title: string;
        posterUrl: string | null;
        subjectId: string | null;
        order: number;
        topicId: string | null;
        durationSeconds: number;
        passingScore: number;
        randomQuestions: boolean;
        randomAnswerOrder: boolean;
        questionCount: number | null;
        teacherAssignmentId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }>;
    create(dto: CreateTestDto, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.TestStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        maxScore: number;
        title: string;
        posterUrl: string | null;
        subjectId: string | null;
        order: number;
        topicId: string | null;
        durationSeconds: number;
        passingScore: number;
        randomQuestions: boolean;
        randomAnswerOrder: boolean;
        questionCount: number | null;
        teacherAssignmentId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }>;
    publish(id: string, user: CurrentUserPayload): Promise<void>;
    assign(id: string, dto: AssignTestDto, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        groupId: string | null;
        studentId: string | null;
        testId: string;
        targetType: import(".prisma/client").$Enums.AssignmentTargetType;
        assignedById: string;
        assignedAt: Date;
        deadline: Date | null;
    }>;
    reopen(id: string, dto: ReopenTestDto, user: CurrentUserPayload): Promise<void>;
}
