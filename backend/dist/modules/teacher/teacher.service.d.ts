import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { AuditService } from '../admin/audit/audit.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/teacher-assignments.dto';
export declare class TeacherService {
    private readonly prisma;
    private readonly groupsService;
    private readonly audit;
    constructor(prisma: PrismaService, groupsService: GroupsService, audit: AuditService);
    getOverview(teacherId: string): Promise<{
        groupsCount: number;
        studentsCount: number;
        assignedTestsCount: number;
        assignmentsCount: number;
        totalAttempts: number;
        averageScore: number;
        groups: {
            id: string;
            name: string;
            studentsCount: number;
        }[];
        recentAssignments: {
            id: string;
            testId: string;
            testTitle: string;
            groupId: string | undefined;
            groupName: string;
            assignedAt: Date;
        }[];
        charts: {
            dailyActivity: {
                date: string;
                count: number;
                avgPercent: number;
            }[];
        };
        topStudents: {
            id: any;
            firstName: any;
            lastName: any;
            username: any;
            totalScore: any;
            level: any;
        }[];
    }>;
    private getDailyActivity;
    getGroupStudents(groupId: string, requester: CurrentUserPayload): Promise<{
        id: string;
        firstName: string;
        lastName: string | null;
        username: string | null;
        totalScore: number;
        level: number;
        testsCompleted: number;
        averagePercent: number | null;
    }[]>;
    listMyGroups(teacherId: string): Promise<({
        _count: {
            members: number;
            assignments: number;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    })[]>;
    getMyGroup(teacherId: string, groupId: string): Promise<{
        members: ({
            student: {
                studentProfile: {
                    totalScore: number;
                    level: number;
                } | null;
                id: string;
                username: string | null;
                firstName: string;
                lastName: string | null;
                status: import(".prisma/client").$Enums.AccountStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            description: string | null;
            groupId: string;
            studentId: string;
            joinedAt: Date;
        })[];
        _count: {
            members: number;
            assignments: number;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    listAssignments(teacherId: string, groupId?: string): Promise<({
        group: {
            id: string;
            name: string;
        };
        tests: {
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
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: import(".prisma/client").$Enums.ContentType;
        category: import(".prisma/client").$Enums.AssignmentCategory;
        mediaUrl: string | null;
        updatedAt: Date;
    })[]>;
    getAssignment(teacherId: string, id: string): Promise<{
        group: {
            id: string;
            name: string;
            teacherId: string | null;
        };
        tests: {
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
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: import(".prisma/client").$Enums.ContentType;
        category: import(".prisma/client").$Enums.AssignmentCategory;
        mediaUrl: string | null;
        updatedAt: Date;
    }>;
    createAssignment(teacherId: string, dto: CreateAssignmentDto): Promise<({
        group: {
            id: string;
            name: string;
        };
        tests: {
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
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: import(".prisma/client").$Enums.ContentType;
        category: import(".prisma/client").$Enums.AssignmentCategory;
        mediaUrl: string | null;
        updatedAt: Date;
    }) | null>;
    updateAssignment(teacherId: string, id: string, dto: UpdateAssignmentDto): Promise<({
        group: {
            id: string;
            name: string;
        };
        tests: {
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
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: import(".prisma/client").$Enums.ContentType;
        category: import(".prisma/client").$Enums.AssignmentCategory;
        mediaUrl: string | null;
        updatedAt: Date;
    }) | null>;
    removeAssignment(teacherId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
