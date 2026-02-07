// src/projections/guard/errors.ts

/**
 * ProjectionGuardErrorCode
 *
 * A closed set of error codes that describe why a projection
 * was blocked before execution.
 *
 * IMPORTANT:
 * - These are structural / policy failures only.
 * - They must NOT encode interpretation, insight, or semantic meaning.
 * - They are safe to log and audit.
 */
export type ProjectionGuardErrorCode =
  /**
   * The system or user is currently paused.
   * Projection execution is disallowed while pause is active.
   */
  | "PAUSED"

  /**
   * The caller does not own or is not permitted to access
   * one or more entities referenced in the projection input.
   */
  | "UNAUTHORIZED"

  /**
   * The projection input failed validation.
   * This includes missing required fields or invalid combinations.
   */
  | "INVALID_INPUT"

  /**
   * The requested projection name does not exist
   * in the immutable projection registry.
   */
  | "UNKNOWN_PROJECTION";

/**
 * ProjectionGuardResult
 *
 * Explicit result type returned by the ProjectionGuardService.
 * Guards NEVER throw for expected policy failures.
 *
 * - ok: true  → projection may proceed
 * - ok: false → projection must not execute
 */
export type ProjectionGuardResult =
  | { ok: true }
  | {
      ok: false;
      code: ProjectionGuardErrorCode;
      message: string;
    };

/**
 * Helper for successful guard checks.
 */
export function guardOk(): ProjectionGuardResult {
  return { ok: true };
}

/**
 * Helper for failed guard checks.
 *
 * @param code    Stable error code for auditing and control flow
 * @param message Human-readable explanation (non-semantic, non-inferential)
 */
export function guardFail(
  code: ProjectionGuardErrorCode,
  message: string
): ProjectionGuardResult {
  return { ok: false, code, message };
}
