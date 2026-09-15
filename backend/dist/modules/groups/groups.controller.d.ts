import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    findAll(user: CurrentUserPayload): Promise<({
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
    findOne(id: string, user: CurrentUserPayload): Promise<{
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
    getGroupStudents(id: string, user: CurrentUserPayload): Promise<({
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
    create(body: {
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
    addStudentToGroup(id: string, body: {
        studentId: string;
    }, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        groupId: string;
        studentId: string;
        joinedAt: Date;
    }>;
    removeStudentFromGroup(id: string, studentId: string, user: CurrentUserPayload): Promise<import(".prisma/client").Prisma.BatchPayload>;
    assignTeacher(id: string, body: {
        teacherId: string;
    }, user: CurrentUserPayload): Promise<{
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
    remove(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        deletedAt: Date | null;
        name: string;
        description: string | null;
        teacherId: string | null;
        assistantId: string | null;
    }>;
}
