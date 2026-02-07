// src/projections/guard/ProjectionGuardService.ts

import { ProjectionContract } from "../contracts/ProjectionContract";
import { ProjectionInput } from "../contracts/types";
import { guardFail, guardOk, ProjectionGuardResult } from "./errors";

/**
 * ProjectionGuardService
 *
 * Centralized, read-only enforcement that decides whether a projection
 * is allowed to execute.
 *
 * HARD RULES:
 * - Guards are pure validation only (no side effects).
 * - Guards must run BEFORE any projection executes.
 * - Guards must not infer, interpret, or derive meaning.
 * - Guards must not mutate state or trigger transitions.
 *
 * What this guard is responsible for:
 * - Pause enforcement (system-level and user-level)
 * - Ownership / access enforcement for referenced entities (sessionId, modelSetId)
 * - Minimal input completeness checks (structural, not semantic)
 *
 * What this guard is NOT responsible for:
 * - Projection-specific shape validation (that belongs to ProjectionContract.validate)
 * - Auditing (that belongs to the ProjectionExecutor)
 *
 * NOTE:
 * This file is intentionally implemented as a skeleton with explicit TODO hooks,
 * because ownership and pause checks depend on your existing Epic 1 services.
 */
export type ProjectionGuardCheckArgs = {
  projection: ProjectionContract<any, any>;
  input: ProjectionInput;
};

export class ProjectionGuardService {
  /**
   * check(...)
   *
   * Returns ok:true if the projection may execute.
   * Returns ok:false if the projection must not execute.
   *
   * Guards do not throw for expected policy blocks.
   */
  async check(args: ProjectionGuardCheckArgs): Promise<ProjectionGuardResult> {
    const { input } = args;

    // -----------------------------
    // 1) Structural input checks
    // -----------------------------
    if (!input?.userId || typeof input.userId !== "string") {
      return guardFail("INVALID_INPUT", "Missing or invalid userId.");
    }

    // timeRange must be complete if provided (no inferred bounds)
    if (input.timeRange) {
      const { from, to } = input.timeRange as any;
      if (!(from instanceof Date) || !(to instanceof Date)) {
        return guardFail("INVALID_INPUT", "timeRange.from and timeRange.to must be Date.");
      }
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return guardFail("INVALID_INPUT", "timeRange bounds must be valid dates.");
      }
      if (from.getTime() > to.getTime()) {
        return guardFail("INVALID_INPUT", "timeRange.from must be <= timeRange.to.");
      }
    }

    // -----------------------------
    // 2) Pause enforcement
    // -----------------------------
    // TODO: Replace with your Epic 1 ControlFlag / pause service.
    // Must enforce "latest-flag-wins" semantics.
    //
    // Example (pseudocode):
    // const paused = await this.pauseService.isPausedForUserOrSystem(input.userId);
    // if (paused) return guardFail("PAUSED", "System is paused.");
    //
    // For now, this guard does not enforce pause until wired to the real service.

    // -----------------------------
    // 3) Ownership / access checks
    // -----------------------------
    // TODO: Replace with your Epic 1 ownership enforcement.
    //
    // Requirements:
    // - If sessionId is provided, it must belong to input.userId.
    // - If modelSetId is provided, it must be owned by input.userId.
    // - If both are provided, they must not contradict ownership.
    //
    // This guard must NOT infer relationships; it must validate explicit references.

    return guardOk();
  }
}
