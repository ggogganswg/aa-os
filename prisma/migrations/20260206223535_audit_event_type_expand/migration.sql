-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'BOOTSTRAP_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'SESSION_CLOSED';
ALTER TYPE "AuditEventType" ADD VALUE 'SYSTEM_PAUSED';
ALTER TYPE "AuditEventType" ADD VALUE 'SYSTEM_RESUMED';
ALTER TYPE "AuditEventType" ADD VALUE 'ACTION_BLOCKED_PAUSED';
ALTER TYPE "AuditEventType" ADD VALUE 'SYSTEM_STATE_TRANSITION';
ALTER TYPE "AuditEventType" ADD VALUE 'SESSION_PHASE_ADVANCED';
ALTER TYPE "AuditEventType" ADD VALUE 'USER_CONTEXT_UPDATED';
