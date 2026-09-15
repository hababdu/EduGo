import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
export declare class CreateTopicDto {
    sectionId: string;
    title: string;
    description?: string;
    posterUrl?: string;
    order?: number;
    sequentialLocked?: boolean;
}
export declare class UpdateTopicDto {
    title?: string;
    description?: string;
    posterUrl?: string;
    order?: number;
    sequentialLocked?: boolean;
    status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
export declare class TopicsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAllBySection(sectionId: string, user: CurrentUserPayload): Promise<any[]>;
    private withLockStatus;
    findOneFor(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }>;
    create(dto: CreateTopicDto): import(".prisma/client").Prisma.Prisma__TopicClient<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateTopicDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }>;
    remove(id: string): Promise<void>;
}
export declare class TopicsController {
    private readonly topicsService;
    constructor(topicsService: TopicsService);
    findAll(sectionId: string, user: CurrentUserPayload): Promise<any[]>;
    findOne(id: string, user: CurrentUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }>;
    create(dto: CreateTopicDto): import(".prisma/client").Prisma.Prisma__TopicClient<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateTopicDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContentStatus;
        deletedAt: Date | null;
        description: string | null;
        title: string;
        posterUrl: string | null;
        order: number;
        sectionId: string;
        sequentialLocked: boolean;
    }>;
    remove(id: string): Promise<void>;
}
