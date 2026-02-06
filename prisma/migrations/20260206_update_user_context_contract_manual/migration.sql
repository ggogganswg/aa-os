-- 1) Drop FK temporarily (required because we alter UserContext)
ALTER TABLE "UserContext" DROP CONSTRAINT IF EXISTS "UserContext_userId_fkey";

-- 2) Preserve existing data: move lastSessionId -> lastClosedSessionId (best-effort)
-- This does NOT guarantee the session is closed; governance checks remain in the service layer.
ALTER TABLE "UserContext" ADD COLUMN IF NOT EXISTS "lastClosedSessionId" TEXT;

UPDATE "UserContext"
SET "lastClosedSessionId" = "lastSessionId"
WHERE "lastSessionId" IS NOT NULL AND "lastClosedSessionId" IS NULL;

-- 3) Apply the actual schema changes
ALTER TABLE "UserContext"
  DROP COLUMN IF EXISTS "lastSessionId",
  DROP COLUMN IF EXISTS "latestCimVersionId",
  DROP COLUMN IF EXISTS "latestFimVersionId",
  ADD COLUMN IF NOT EXISTS "activeModelSetId" TEXT,
  ADD COLUMN IF NOT EXISTS "contextVersion" INTEGER NOT NULL DEFAULT 1;

-- 4) Create ModelSet table (if missing)
CREATE TABLE IF NOT EXISTS "ModelSet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelSet_pkey" PRIMARY KEY ("id")
);

-- 5) Indexes
CREATE INDEX IF NOT EXISTS "ModelSet_userId_idx" ON "ModelSet"("userId");
CREATE INDEX IF NOT EXISTS "ModelSet_sessionId_idx" ON "ModelSet"("sessionId");
CREATE INDEX IF NOT EXISTS "UserContext_activeModelSetId_idx" ON "UserContext"("activeModelSetId");
CREATE INDEX IF NOT EXISTS "UserContext_lastClosedSessionId_idx" ON "UserContext"("lastClosedSessionId");

-- 6) Re-add FKs
ALTER TABLE "UserContext"
  ADD CONSTRAINT "UserContext_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModelSet"
  ADD CONSTRAINT "ModelSet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModelSet"
  ADD CONSTRAINT "ModelSet_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
