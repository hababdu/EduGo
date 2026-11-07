import { IsEnum } from 'class-validator';

export enum TrialReviewDecision { APPROVED = 'APPROVED', REJECTED = 'REJECTED' }
export class ReviewTrialDto { @IsEnum(TrialReviewDecision) decision: TrialReviewDecision; }
