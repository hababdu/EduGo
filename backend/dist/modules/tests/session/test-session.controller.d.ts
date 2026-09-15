import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TestSessionService } from './test-session.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
export declare class TestSessionController {
    private readonly sessionService;
    constructor(sessionService: TestSessionService);
    start(testId: string, user: CurrentUserPayload): Promise<{
        sessionId: any;
        testTitle: any;
        remainingSeconds: number;
        questions: any;
    }>;
    saveAnswer(testId: string, dto: SubmitAnswerDto, user: CurrentUserPayload): Promise<{
        id: string;
        sessionId: string;
        isCorrect: boolean | null;
        questionId: string;
        selectedOptionIds: string[];
        textAnswer: string | null;
        answeredAt: Date;
    }>;
    getSession(testId: string, user: CurrentUserPayload): Promise<{
        savedAnswers: {
            questionId: string;
            selectedOptionIds: string[];
            textAnswer: string | null;
        }[];
        sessionId: any;
        testTitle: any;
        remainingSeconds: number;
        questions: any;
    }>;
    submit(testId: string, user: CurrentUserPayload): Promise<{
        score: number;
        maxScore: number;
        percent: number;
        passed: boolean;
        timeSpentSeconds: number;
        autoSubmitted: boolean;
    }>;
}
