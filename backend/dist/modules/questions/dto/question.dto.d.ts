declare class AnswerOptionInput {
    text: string;
    isCorrect: boolean;
}
export declare class CreateQuestionDto {
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT_ANSWER';
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    text: string;
    explanation?: string;
    points?: number;
    subjectId?: string;
    topicId?: string;
    tags?: string[];
    options: AnswerOptionInput[];
}
export declare class QuestionFilterDto {
    subjectId?: string;
    topicId?: string;
    difficulty?: string;
}
export {};
