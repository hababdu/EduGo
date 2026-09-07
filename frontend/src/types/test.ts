// src/types/test.ts

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  TEXT_ANSWER = 'TEXT_ANSWER',
}

export interface AnswerOptionDTO {
  id: string;
  text: string;
  order: number;
}

export interface QuestionDTO {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  options: AnswerOptionDTO[]; // isCorrect FRONTENDGA KELMAYDI!
}

export interface TestSessionDTO {
  id: string;
  testId: string;
  startedAt: string; // ISO String
  durationSeconds: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  test: {
    title: string;
    description?: string;
    passingScore: number;
  };
  questions: QuestionDTO[];
  savedAnswers: Record<string, { selectedOptionIds: string[]; textAnswer?: string }>;
}

export interface SubmitTestResponseDTO {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSeconds: number;
}