CREATE TABLE "SchoolMediaAsset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "telegramFileId" TEXT NOT NULL,
  "telegramMessageId" INTEGER NOT NULL,
  "telegramChatId" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolMediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolMediaAsset_organizationId_purpose_createdAt_idx" ON "SchoolMediaAsset"("organizationId", "purpose", "createdAt");
CREATE INDEX "SchoolMediaAsset_uploaderId_idx" ON "SchoolMediaAsset"("uploaderId");
