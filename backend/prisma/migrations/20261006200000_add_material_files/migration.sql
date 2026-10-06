-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'FILE';

-- AlterTable
ALTER TABLE "TeacherAssignment"
  ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "dueAt" TIMESTAMP(3);

-- Mavjud materiallar allaqachon e'lon qilingan hisoblanadi
UPDATE "TeacherAssignment" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- CreateTable
CREATE TABLE "MaterialFile" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "kind" "ContentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "tgFileId" TEXT NOT NULL,
    "tgMessageId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialView" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialFile_assignmentId_order_idx" ON "MaterialFile"("assignmentId", "order");
CREATE INDEX "MaterialFile_uploaderId_assignmentId_idx" ON "MaterialFile"("uploaderId", "assignmentId");
CREATE UNIQUE INDEX "MaterialView_assignmentId_studentId_key" ON "MaterialView"("assignmentId", "studentId");
CREATE INDEX "MaterialView_studentId_idx" ON "MaterialView"("studentId");

-- AddForeignKey
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialView" ADD CONSTRAINT "MaterialView_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
