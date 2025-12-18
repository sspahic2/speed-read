-- Add LibraryFile table to track saved blobs per user
CREATE TABLE "LibraryFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryFile_userId_idx" ON "LibraryFile"("userId");

ALTER TABLE "LibraryFile"
  ADD CONSTRAINT "LibraryFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
