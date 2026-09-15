import { PrismaService } from '../../../prisma/prisma.service';
export declare class AssignmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(teacherId: string, dto: any): Promise<{
        tests: {
            question: string;
            id: string;
            options: string[];
            correctOption: number;
            assignmentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: string;
        category: string;
        mediaUrl: string | null;
        updatedAt: Date;
    }>;
    findAllForTeacher(teacherId: string, groupId?: string): Promise<({
        tests: {
            question: string;
            id: string;
            options: string[];
            correctOption: number;
            assignmentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: string;
        category: string;
        mediaUrl: string | null;
        updatedAt: Date;
    })[]>;
    findOne(id: string, teacherId: string): Promise<{
        tests: {
            question: string;
            id: string;
            options: string[];
            correctOption: number;
            assignmentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: string;
        category: string;
        mediaUrl: string | null;
        updatedAt: Date;
    }>;
    update(id: string, teacherId: string, dto: any): Promise<{
        tests: {
            question: string;
            id: string;
            options: string[];
            correctOption: number;
            assignmentId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: string;
        category: string;
        mediaUrl: string | null;
        updatedAt: Date;
    }>;
    remove(id: string, teacherId: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        teacherId: string;
        groupId: string;
        title: string;
        type: string;
        category: string;
        mediaUrl: string | null;
        updatedAt: Date;
    }>;
}
