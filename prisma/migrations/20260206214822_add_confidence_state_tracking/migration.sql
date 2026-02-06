-- CreateEnum
CREATE TYPE "ConfidenceDomain" AS ENUM ('IDENTITY_MODEL', 'SESSION', 'SYSTEM');

-- CreateTable
CREATE TABLE "ConfidenceState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" "ConfidenceDomain" NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "modelSetId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfidenceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfidenceState_userId_domain_key_createdAt_idx" ON "ConfidenceState"("userId", "domain", "key", "createdAt");

-- CreateIndex
CREATE INDEX "ConfidenceState_modelSetId_createdAt_idx" ON "ConfidenceState"("modelSetId", "createdAt");

-- CreateIndex
CREATE INDEX "ConfidenceState_sessionId_createdAt_idx" ON "ConfidenceState"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConfidenceState" ADD CONSTRAINT "ConfidenceState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
