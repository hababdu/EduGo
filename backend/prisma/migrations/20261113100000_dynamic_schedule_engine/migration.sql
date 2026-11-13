ALTER TABLE "ScheduleSlot" ADD COLUMN "startsOn" DATE;
ALTER TABLE "ScheduleSlot" ADD COLUMN "endsOn" DATE;
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_date_range_check"
  CHECK ("startsOn" IS NULL OR "endsOn" IS NULL OR "endsOn" >= "startsOn");

CREATE TABLE "ScheduleSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sessionType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "teacherId" TEXT NOT NULL,
  "studentId" TEXT,
  "groupId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "room" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleSession_time_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "ScheduleSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ScheduleSession_organizationId_startsAt_endsAt_idx" ON "ScheduleSession"("organizationId","startsAt","endsAt");
CREATE INDEX "ScheduleSession_teacherId_startsAt_endsAt_idx" ON "ScheduleSession"("teacherId","startsAt","endsAt");
CREATE INDEX "ScheduleSession_studentId_startsAt_endsAt_idx" ON "ScheduleSession"("studentId","startsAt","endsAt");
CREATE INDEX "ScheduleSession_groupId_startsAt_idx" ON "ScheduleSession"("groupId","startsAt");
