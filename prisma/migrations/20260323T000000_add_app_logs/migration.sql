-- CreateTable
CREATE TABLE "AppLog" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "source" TEXT,

    CONSTRAINT "AppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppLog_createdAt_idx" ON "AppLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AppLog_level_idx" ON "AppLog"("level");

-- CreateIndex
CREATE INDEX "AppLog_source_idx" ON "AppLog"("source");
