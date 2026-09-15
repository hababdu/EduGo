import { Request } from 'express';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
interface RequestWithUser extends Request {
    user?: {
        id?: string;
        _id?: string;
        userId?: string;
    };
}
export declare class AssignmentsController {
    private readonly assignmentsService;
    constructor(assignmentsService: AssignmentsService);
    create(dto: CreateAssignmentDto, req: RequestWithUser): Promise<{
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
    findAll(groupId?: string, req?: RequestWithUser): Promise<({
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
    findOne(id: string, req: RequestWithUser): Promise<{
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
    update(id: string, dto: Partial<CreateAssignmentDto>, req: RequestWithUser): Promise<{
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
    remove(id: string, req: RequestWithUser): Promise<{
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
export {};
