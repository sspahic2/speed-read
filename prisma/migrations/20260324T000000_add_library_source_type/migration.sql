-- AlterTable
ALTER TABLE "LibraryFile" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'upload';

-- CreateIndex
CREATE INDEX "LibraryFile_userId_sourceType_idx" ON "LibraryFile"("userId", "sourceType");
