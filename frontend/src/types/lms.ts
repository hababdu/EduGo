export enum ContentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum VideoSource {
  YOUTUBE = 'YOUTUBE',
  TELEGRAM = 'TELEGRAM',
  EXTERNAL_URL = 'EXTERNAL_URL',
  CLOUD_STORAGE = 'CLOUD_STORAGE',
}

export enum MaterialType {
  PDF = 'PDF',
  DOC = 'DOC',
  PPT = 'PPT',
  IMAGE = 'IMAGE',
  OTHER = 'OTHER',
}

export interface MaterialDTO {
  id: string;
  title: string;
  type: MaterialType;
  fileUrl: string;
  downloadable: boolean;
}

export interface VideoDTO {
  id: string;
  source: VideoSource;
  url: string;
  duration?: number;
  progressPercent?: number; // Talaba ko'rgan foizi (0, 25, 50, 75, 100)
}

export interface LessonDTO {
  id: string;
  topicId: string;
  title: string;
  order: number;
  materials: MaterialDTO[];
  videos: VideoDTO[];
}

export interface TopicDTO {
  id: string;
  title: string;
  description?: string;
  order: number;
  sequentialLocked: boolean;
  lessons: LessonDTO[];
}

export interface SectionDTO {
  id: string;
  title: string;
  order: number;
  topics: TopicDTO[];
}

export interface SubjectDTO {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  posterUrl?: string;
  sections: SectionDTO[];
}

export interface CourseDTO {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string;
  status: ContentStatus;
  subjects: SubjectDTO[];
}