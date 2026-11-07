CREATE TYPE "TrialLessonStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'REJECTED');

CREATE TABLE "TrialLesson" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "TrialLessonStatus" NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "attendedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrialLesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrialLesson_userId_organizationId_key" ON "TrialLesson"("userId", "organizationId");
CREATE INDEX "TrialLesson_organizationId_status_scheduledAt_idx" ON "TrialLesson"("organizationId", "status", "scheduledAt");
CREATE INDEX "TrialLesson_groupId_scheduledAt_idx" ON "TrialLesson"("groupId", "scheduledAt");

ALTER TABLE "TrialLesson" ADD CONSTRAINT "TrialLesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrialLesson" ADD CONSTRAINT "TrialLesson_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrialLesson" ADD CONSTRAINT "TrialLesson_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
