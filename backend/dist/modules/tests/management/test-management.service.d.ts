import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../admin/audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
export declare class TestManagementService {
    private readonly prisma;
    private readonly audit;
    private readonly notifications;
    constructor(prisma: PrismaService, audit: AuditService, notifications: NotificationsService);
    list(requester: CurrentUserPayload, filters: {
        subjectId?: string;
        status?: string;
    }): Promise<({
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
    getDetail(testId: string, requester: CurrentUserPayload): Promise<{
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
    listAssignedForStudent(studentId: string): Promise<{
        testId: string;
        title: string;
        durationSeconds: number;
        deadline: Date | null;
        status: "PENDING" | "COMPLETED" | "RETAKE_AVAILABLE";
        score: number | undefined;
        maxScore: number | undefined;
        passed: boolean | undefined;
    }[]>;
    create(dto: CreateTestDto, actorId: string): Promise<{
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
    publish(testId: string, actorId: string): Promise<void>;
    assign(testId: string, dto: AssignTestDto, actorId: string): Promise<{
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
    private resolveTargetStudentIds;
    reopenForStudent(testId: string, dto: ReopenTestDto, actorId: string): Promise<void>;
    private getOrThrow;
}
