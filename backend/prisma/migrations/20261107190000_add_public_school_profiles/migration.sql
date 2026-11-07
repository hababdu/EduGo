ALTER TABLE "Organization"
  ADD COLUMN "publiclyListed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "educationLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_publiclyListed_status_city_idx"
  ON "Organization"("publiclyListed", "status", "city");
