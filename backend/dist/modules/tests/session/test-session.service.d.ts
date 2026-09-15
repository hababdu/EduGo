import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ChallengesService } from '../../gamification/challenges/challenges.service';
import { NotificationsService } from '../../notifications/notifications.service';
export declare class TestSessionService {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly challengesService;
    private readonly notifications;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, challengesService: ChallengesService, notifications: NotificationsService);
    start(testId: string, studentId: string): Promise<{
        sessionId: any;
        testTitle: any;
        remainingSeconds: number;
        questions: any;
    }>;
    saveAnswer(testId: string, studentId: string, dto: SubmitAnswerDto): Promise<{
        id: string;
        sessionId: string;
        isCorrect: boolean | null;
        questionId: string;
        selectedOptionIds: string[];
        textAnswer: string | null;
        answeredAt: Date;
    }>;
    getSession(testId: string, studentId: string): Promise<{
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
    submit(testId: string, studentId: string): Promise<{
        score: number;
        maxScore: number;
        percent: number;
        passed: boolean;
        timeSpentSeconds: number;
        autoSubmitted: boolean;
    }>;
    private gradeAndFinish;
    private emitScoreChanged;
    private autoSubmitExpired;
    private computeRemainingSeconds;
    private pickRandom;
    private buildSessionResponse;
    private getPublishedTestOrThrow;
    private assertWithinSchedule;
    private getActiveSessionOrThrow;
}
