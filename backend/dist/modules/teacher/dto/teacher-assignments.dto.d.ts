declare const CONTENT_TYPES: readonly ["TEXT", "IMAGE", "PDF", "VIDEO"];
declare const CATEGORIES: readonly ["LESSON", "HOMEWORK", "RESOURCE"];
export declare class AssignmentTestDto {
    question: string;
    options: string[];
    correctOption: number;
}
export declare class CreateAssignmentDto {
    title: string;
    description?: string;
    type: (typeof CONTENT_TYPES)[number];
    category: (typeof CATEGORIES)[number];
    mediaUrl?: string;
    groupId: string;
    tests?: AssignmentTestDto[];
}
export declare class UpdateAssignmentDto {
    title?: string;
    description?: string;
    type?: (typeof CONTENT_TYPES)[number];
    category?: (typeof CATEGORIES)[number];
    mediaUrl?: string;
    groupId?: string;
    tests?: AssignmentTestDto[];
}
export {};
