-- CreateEnum
CREATE TYPE "AssignmentGrading" AS ENUM ('PENDING', 'RUNNING', 'DONE');
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'GRADED', 'NEEDS_REVIEW', 'FAILED');

-- AlterTable
ALTER TABLE "TeacherAssignment"
  ADD COLUMN "maxScore" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "gradingStatus" "AssignmentGrading" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "gradedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textAnswer" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiScore" INTEGER,
    "aiFeedback" TEXT,
    "aiStrengths" TEXT[],
    "aiImprovements" TEXT[],
    "aiModel" TEXT,
    "gradeAttempts" INTEGER NOT NULL DEFAULT 0,
    "gradeError" TEXT,
    "gradedAt" TIMESTAMP(3),
    "teacherScore" INTEGER,
    "teacherFeedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MaterialFile" ADD COLUMN "submissionId" TEXT;

CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX "AssignmentSubmission_assignmentId_status_idx" ON "AssignmentSubmission"("assignmentId", "status");
CREATE INDEX "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");
CREATE INDEX "MaterialFile_submissionId_idx" ON "MaterialFile"("submissionId");

ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
