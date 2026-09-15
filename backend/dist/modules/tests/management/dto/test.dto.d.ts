export declare class CreateTestDto {
    title: string;
    description?: string;
    subjectId?: string;
    topicId?: string;
    durationSeconds: number;
    passingScore: number;
    randomQuestions?: boolean;
    randomAnswerOrder?: boolean;
    questionCount?: number;
    questionIds: string[];
    startDate?: string;
    endDate?: string;
}
export declare class AssignTestDto {
    targetType: 'ALL' | 'GROUP' | 'INDIVIDUAL';
    groupId?: string;
    studentId?: string;
    deadline?: string;
}
export declare class ReopenTestDto {
    studentId: string;
}
