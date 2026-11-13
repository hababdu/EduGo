import { SetMetadata } from '@nestjs/common';
export const EDUCATION_FEATURE_KEY = 'education_feature';
export type EducationFeatureKey = 'GROUPS' | 'COURSES' | 'SUBJECTS' | 'SCHEDULE' | 'ATTENDANCE' | 'LESSONS' | 'MATERIALS' | 'ASSIGNMENTS' | 'GRADING' | 'TESTS' | 'PAYMENTS' | 'CERTIFICATES' | 'ANALYTICS' | 'PARENT_ACCESS' | 'TRIAL_LESSONS';
export const RequireEducationFeature = (feature: EducationFeatureKey) => SetMetadata(EDUCATION_FEATURE_KEY, feature);
