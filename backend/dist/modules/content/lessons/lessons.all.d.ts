import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { StreakService } from '../../gamification/streak/streak.service';
export declare class CreateLessonDto {
    topicId: string;
    title: string;
    order?: number;
}
export declare class UpdateLessonDto {
    title?: string;
    order?: number;
}
export declare class UpdateVideoProgressDto {
    percent: number;
}
export declare class CreateVideoDto {
    source: 'YOUTUBE' | 'TELEGRAM' | 'EXTERNAL_URL' | 'CLOUD_STORAGE';
    url: string;
    duration?: number;
}
export declare class CreateMaterialDto {
    type: 'PDF' | 'DOC' | 'PPT' | 'IMAGE' | 'OTHER';
    fileUrl: string;
    title: string;
}
export declare class LessonsService {
    private readonly prisma;
    private readonly streakService;
    constructor(prisma: PrismaService, streakService: StreakService);
    findAllByTopic(topicId: string): import(".prisma/client").Prisma.PrismaPromise<({
        materials: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.MaterialType;
            fileUrl: string;
            lessonId: string;
            downloadable: boolean;
        }[];
        videos: {
            id: string;
            source: import(".prisma/client").$Enums.VideoSource;
            url: string;
            duration: number | null;
            lessonId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    })[]>;
    create(dto: CreateLessonDto): import(".prisma/client").Prisma.Prisma__LessonClient<{
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    }>;
    remove(id: string): Promise<void>;
    addVideo(lessonId: string, dto: CreateVideoDto): Promise<{
        id: string;
        source: import(".prisma/client").$Enums.VideoSource;
        url: string;
        duration: number | null;
        lessonId: string;
    }>;
    addMaterial(lessonId: string, dto: CreateMaterialDto): Promise<{
        id: string;
        title: string;
        type: import(".prisma/client").$Enums.MaterialType;
        fileUrl: string;
        lessonId: string;
        downloadable: boolean;
    }>;
    updateVideoProgress(videoId: string, percent: number, studentId: string): Promise<{
        id: string;
        studentId: string;
        percent: number;
        updatedAt: Date;
        videoId: string;
    }>;
}
export declare class LessonsController {
    private readonly lessonsService;
    constructor(lessonsService: LessonsService);
    findAll(topicId: string): import(".prisma/client").Prisma.PrismaPromise<({
        materials: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.MaterialType;
            fileUrl: string;
            lessonId: string;
            downloadable: boolean;
        }[];
        videos: {
            id: string;
            source: import(".prisma/client").$Enums.VideoSource;
            url: string;
            duration: number | null;
            lessonId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    })[]>;
    create(dto: CreateLessonDto): import(".prisma/client").Prisma.Prisma__LessonClient<{
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, dto: UpdateLessonDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        topicId: string;
    }>;
    remove(id: string): Promise<void>;
    addVideo(lessonId: string, dto: CreateVideoDto): Promise<{
        id: string;
        source: import(".prisma/client").$Enums.VideoSource;
        url: string;
        duration: number | null;
        lessonId: string;
    }>;
    addMaterial(lessonId: string, dto: CreateMaterialDto): Promise<{
        id: string;
        title: string;
        type: import(".prisma/client").$Enums.MaterialType;
        fileUrl: string;
        lessonId: string;
        downloadable: boolean;
    }>;
    updateProgress(videoId: string, dto: UpdateVideoProgressDto, user: CurrentUserPayload): Promise<{
        id: string;
        studentId: string;
        percent: number;
        updatedAt: Date;
        videoId: string;
    }>;
}
