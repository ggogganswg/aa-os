// src/projections/contracts/ProjectionContract.ts

import { ProjectionContext } from "./ProjectionContext";
import { ProjectionInput, ProjectionName, SourceModelKey } from "./types";

/**
 * A ProjectionContract defines a single read-only, deterministic projection.
 *
 * Hard guarantees:
 * - Read-only: must only use ctx.db (which is read-only by construction)
 * - Deterministic: output is a pure function of (input, source records)
 * - Recomputable: can be regenerated from source records at any time
 * - No side effects: must not trigger transitions, writes, or interpretation
 */
export interface ProjectionContract<I extends ProjectionInput, O> {
  /**
   * Closed-set name. No ad-hoc names allowed.
   */
  name: ProjectionName;

  /**
   * Exact Epic 1 source models this projection is allowed to read.
   * Used by guard/audit to enforce and record the read surface.
   */
  sources: readonly SourceModelKey[];

  /**
   * Projection-specific input validation (shape + projection rules).
   * Ownership / pause enforcement belongs to the guard service, not here.
   * Must throw an Error on invalid input.
   */
  validate(input: I): void;

  /**
   * Execute the projection using read-only capabilities.
   * Must not mutate any state.
   */
  run(ctx: ProjectionContext, input: I): Promise<O>;
}
