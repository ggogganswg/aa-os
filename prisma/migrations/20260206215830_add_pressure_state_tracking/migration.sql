-- CreateEnum
CREATE TYPE "PressureLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "PressureState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dpi" INTEGER NOT NULL,
    "level" "PressureLevel" NOT NULL,
    "reason" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PressureState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PressureState_userId_createdAt_idx" ON "PressureState"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PressureState_sessionId_createdAt_idx" ON "PressureState"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PressureState" ADD CONSTRAINT "PressureState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
