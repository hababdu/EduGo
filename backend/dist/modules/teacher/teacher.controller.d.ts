import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TeacherService } from './teacher.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/teacher-assignments.dto';
export declare class TeacherController {
    private readonly teacherService;
    constructor(teacherService: TeacherService);
    getOverview(user: CurrentUserPayload): Promise<{
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
    listMyGroups(user: CurrentUserPayload): Promise<({
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
    getMyGroup(groupId: string, user: CurrentUserPayload): Promise<{
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
    getGroupStudents(groupId: string, user: CurrentUserPayload): Promise<{
        id: string;
        firstName: string;
        lastName: string | null;
        username: string | null;
        totalScore: number;
        level: number;
        testsCompleted: number;
        averagePercent: number | null;
    }[]>;
    listAssignments(user: CurrentUserPayload, groupId?: string): Promise<({
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
    getAssignment(id: string, user: CurrentUserPayload): Promise<{
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
    createAssignment(user: CurrentUserPayload, dto: CreateAssignmentDto): Promise<({
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
    updateAssignment(id: string, user: CurrentUserPayload, dto: UpdateAssignmentDto): Promise<({
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
    removeAssignment(id: string, user: CurrentUserPayload): Promise<{
        ok: boolean;
    }>;
}
