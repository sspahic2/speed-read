-- Drop unique constraint on (userId, fileId) for ReaderProgress to allow history entries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ReaderProgress_userId_fileId_key'
  ) THEN
    EXECUTE 'DROP INDEX "ReaderProgress_userId_fileId_key"';
  END IF;
END
$$;
