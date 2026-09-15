import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
export declare class CreateSectionDto {
    subjectId: string;
    title: string;
    description?: string;
    posterUrl?: string;
    order?: number;
}
export declare class UpdateSectionDto {
    title?: string;
    description?: string;
    posterUrl?: string;
    order?: number;
    status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
export declare class SectionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllBySubject(subjectId: string, user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }[]>;
    findOneFor(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }>;
    create(dto: CreateSectionDto): import(".prisma/client").Prisma.Prisma__SectionClient<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateSectionDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }>;
    remove(id: string): Promise<void>;
}
export declare class SectionsController {
    private readonly sectionsService;
    constructor(sectionsService: SectionsService);
    findAll(subjectId: string, user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }[]>;
    findOne(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }>;
    create(dto: CreateSectionDto): import(".prisma/client").Prisma.Prisma__SectionClient<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateSectionDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        subjectId: string;
        order: number;
    }>;
    remove(id: string): Promise<void>;
}
