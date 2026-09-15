export declare enum AssignmentType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    PDF = "PDF",
    VIDEO = "VIDEO"
}
export declare enum AssignmentCategory {
    LESSON = "LESSON",
    HOMEWORK = "HOMEWORK",
    RESOURCE = "RESOURCE"
}
export declare class TestQuestionDto {
    question: string;
    options: string[];
    correctOption: number;
}
export declare class CreateAssignmentDto {
    title: string;
    description?: string;
    type: AssignmentType;
    category: AssignmentCategory;
    mediaUrl?: string;
    groupId: string;
    tests?: TestQuestionDto[];
}
