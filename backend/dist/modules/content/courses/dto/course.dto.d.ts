export declare class CreateCourseDto {
    title: string;
    description?: string;
    posterUrl?: string;
    startDate?: string;
    endDate?: string;
}
export declare class UpdateCourseDto {
    title?: string;
    description?: string;
    posterUrl?: string;
    status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
