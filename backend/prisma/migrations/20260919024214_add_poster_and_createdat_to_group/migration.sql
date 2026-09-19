/*
  Warnings:

  - You are about to drop the column `createdAt` on the `AssignmentTest` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `AssignmentTest` table. All the data in the column will be lost.
  - You are about to drop the column `teacherAssignmentId` on the `AssignmentTest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AssignmentTest" DROP CONSTRAINT "AssignmentTest_teacherAssignmentId_fkey";

-- DropIndex
DROP INDEX "AssignmentTest_assignmentId_order_idx";

-- AlterTable
ALTER TABLE "AssignmentTest" DROP COLUMN "createdAt",
DROP COLUMN "order",
DROP COLUMN "teacherAssignmentId";

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "posterUrl" TEXT;

-- CreateIndex
CREATE INDEX "Group_deletedAt_createdAt_idx" ON "Group"("deletedAt", "createdAt" DESC);
