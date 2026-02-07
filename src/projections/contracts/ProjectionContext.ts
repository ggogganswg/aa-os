import { DbReadContext } from "../../db-read/types";
import { ProjectionName, SourceModelKey } from "./types";

export type ProjectionAccessAudit = {
  userId: string;
  sessionId?: string;
  projection: ProjectionName;
  inputsHash: string;
  sources: readonly SourceModelKey[];
  occurredAt: Date;
};

export interface ProjectionContext {
  /**
   * Read-only database surface.
   * Exposes ONLY read operations for allowlisted models.
   */
  db: DbReadContext;

  /**
   * Emit a typed audit event for projection access.
   * Must be called exactly once per execution by the executor.
   */
  audit: (event: ProjectionAccessAudit) => Promise<void>;

  /**
   * Time source (injectable for determinism in tests).
   */
  now: () => Date;
}