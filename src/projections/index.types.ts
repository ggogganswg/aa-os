// src/projections/index.types.ts

import { ProjectionAccessAudit } from "./contracts/ProjectionContext";

/**
 * ProjectionAuditEmitter
 *
 * Adapter signature used by the projection composition root.
 * The ProjectionExecutor will call ctx.audit(...) exactly once per successful execution.
 *
 * This emitter is allowed to perform ONE side effect only:
 * - persist a typed AuditEvent recording projection access
 *
 * It must not:
 * - trigger transitions
 * - mutate any Epic 1 state (beyond audit persistence)
 * - infer or interpret meaning
 */
export type ProjectionAuditEmitter = (event: ProjectionAccessAudit) => Promise<void>;
