import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
export declare class SubjectsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllByCourse(courseId: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        courseId: string;
    }[]>;
    findOneFor(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        courseId: string;
    }>;
    create(dto: CreateSubjectDto): import(".prisma/client").Prisma.Prisma__SubjectClient<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        courseId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateSubjectDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        courseId: string;
    }>;
    remove(id: string): Promise<void>;
}
