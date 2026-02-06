-- CreateEnum
CREATE TYPE "IdentityModelType" AS ENUM ('CIM', 'FIM');

-- CreateEnum
CREATE TYPE "IdentityModelStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "IdentityModelVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelSetId" TEXT NOT NULL,
    "type" "IdentityModelType" NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "IdentityModelStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityModelVersion_userId_createdAt_idx" ON "IdentityModelVersion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityModelVersion_modelSetId_type_createdAt_idx" ON "IdentityModelVersion"("modelSetId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityModelVersion_modelSetId_type_version_key" ON "IdentityModelVersion"("modelSetId", "type", "version");

-- AddForeignKey
ALTER TABLE "IdentityModelVersion" ADD CONSTRAINT "IdentityModelVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityModelVersion" ADD CONSTRAINT "IdentityModelVersion_modelSetId_fkey" FOREIGN KEY ("modelSetId") REFERENCES "ModelSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
