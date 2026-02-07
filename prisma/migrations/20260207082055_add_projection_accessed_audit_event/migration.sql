-- AuditEventType enum value already exists in the database (drift reconciliation).
-- This is safe even if already present.
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'PROJECTION_ACCESSED';
