import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    findAll(user: CurrentUserPayload): Promise<{
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
    findOne(id: string, user: CurrentUserPayload): Promise<{
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
    create(createCourseDto: CreateCourseDto & {
        type?: string;
        category?: string;
        mediaUrl?: string;
        groupId?: string;
    }, user: CurrentUserPayload): Promise<{
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
    update(id: string, updateCourseDto: UpdateCourseDto & {
        type?: string;
        category?: string;
        mediaUrl?: string;
        groupId?: string;
    }, user: CurrentUserPayload): Promise<{
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
    remove(id: string, user: CurrentUserPayload): Promise<void>;
}
