import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
export declare class GroupsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findGroupStudents(groupId: string, user: CurrentUserPayload): Promise<({
        student: {
            id: string;
            phone: string | null;
            username: string | null;
            firstName: string;
            lastName: string | null;
            role: import(".prisma/client").$Enums.RoleName;
        };
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        groupId: string;
        studentId: string;
        joinedAt: Date;
    })[]>;
    findAllForUser(user: CurrentUserPayload): Promise<({
        teacher: {
            id: string;
            username: string | null;
            firstName: string;
            lastName: string | null;
        } | null;
        _count: {
            members: number;
        };
    } & {
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    })[]>;
    createGroup(data: {
        name: string;
        description?: string;
    }, user: CurrentUserPayload): Promise<{
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    addStudentToGroup(groupId: string, studentId: string, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        groupId: string;
        studentId: string;
        joinedAt: Date;
    }>;
    findOneOrThrow(groupId: string, user: CurrentUserPayload): Promise<{
        teacher: {
            id: string;
            username: string | null;
            firstName: string;
            lastName: string | null;
        } | null;
        members: {
            id: string;
            createdAt: Date;
            description: string | null;
            groupId: string;
            studentId: string;
            joinedAt: Date;
        }[];
    } & {
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    removeStudentFromGroup(groupId: string, studentId: string, user: CurrentUserPayload): Promise<import(".prisma/client").Prisma.BatchPayload>;
    assignTeacher(groupId: string, teacherId: string, user: CurrentUserPayload): Promise<{
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    deleteGroup(groupId: string, user: CurrentUserPayload): Promise<{
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    private assertCanAccess;
}
