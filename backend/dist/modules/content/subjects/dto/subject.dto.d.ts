export declare class CreateSubjectDto {
    courseId: string;
    title: string;
    description?: string;
    posterUrl?: string;
    order?: number;
}
export declare class UpdateSubjectDto {
    title?: string;
    description?: string;
    posterUrl?: string;
    order?: number;
    status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
