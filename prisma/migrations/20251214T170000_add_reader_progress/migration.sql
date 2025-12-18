-- Track reader progress per user and file, with block + offset
CREATE TABLE "ReaderProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "offset" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReaderProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReaderProgress_userId_fileId_key" ON "ReaderProgress"("userId", "fileId");
CREATE INDEX "ReaderProgress_fileId_idx" ON "ReaderProgress"("fileId");

ALTER TABLE "ReaderProgress"
  ADD CONSTRAINT "ReaderProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReaderProgress"
  ADD CONSTRAINT "ReaderProgress_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "LibraryFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
