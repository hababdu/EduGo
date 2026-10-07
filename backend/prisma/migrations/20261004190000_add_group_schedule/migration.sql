-- Guruh dars jadvali
ALTER TABLE "Group" ADD COLUMN "lessonDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Group" ADD COLUMN "lessonStartTime" TEXT;
ALTER TABLE "Group" ADD COLUMN "lessonEndTime" TEXT;
ALTER TABLE "Group" ADD COLUMN "room" TEXT;
