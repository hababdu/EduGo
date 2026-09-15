import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { AuditService } from '../../admin/audit/audit.service';
export declare class CoursesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    findAllFor(user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        title: string;
        posterUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }[]>;
    findOneFor(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        title: string;
        posterUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }>;
    create(dto: CreateCourseDto & {
        type?: string;
        category?: string;
        mediaUrl?: string;
    }, actorId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        title: string;
        posterUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }>;
    update(id: string, dto: UpdateCourseDto & {
        type?: string;
        category?: string;
        mediaUrl?: string;
    }, actorId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        createdAt: Date;
        description: string | null;
        title: string;
        posterUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
        createdById: string;
    }>;
    remove(id: string, actorId: string): Promise<void>;
}
