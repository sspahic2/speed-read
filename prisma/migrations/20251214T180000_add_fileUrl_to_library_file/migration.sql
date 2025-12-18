-- Add fileUrl to LibraryFile
ALTER TABLE "LibraryFile" ADD COLUMN "fileUrl" TEXT NOT NULL DEFAULT '';
