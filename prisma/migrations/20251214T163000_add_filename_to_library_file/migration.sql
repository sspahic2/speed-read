-- Add fileName to LibraryFile to track original upload name
ALTER TABLE "LibraryFile"
ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '';
