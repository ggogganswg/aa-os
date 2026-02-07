// src/projections/contracts/types.ts

/**
 * ProjectionName is a closed set.
 * No ad-hoc projection identifiers are allowed.
 */
export type ProjectionName =
  | "session.timeline"
  | "identity.versionTimeline"
  | "confidence.series"
  | "pressure.series"
  | "controlFlags.timeline"
  | "systemState.timeline";

/**
 * Source models that projections are allowed to read.
 * Anything not listed here is forbidden by the framework.
 */
export type SourceModelKey =
  | "User"
  | "Session"
  | "UserContext"
  | "ModelSet"
  | "IdentityModelVersion"
  | "ConfidenceState"
  | "PressureState"
  | "ControlFlag"
  | "AuditEvent";

/**
 * Every projection input must be explicit.
 * No implicit context, no ambient parameters.
 */
export type ProjectionInput = {
  userId: string;

  /**
   * Optional depending on the projection.
   * Ownership must be enforced by the guard service.
   */
  sessionId?: string;

  /**
   * Optional depending on the projection.
   * Ownership must be enforced by the guard service.
   */
  modelSetId?: string;

  /**
   * Optional time windowing. Projections must not infer missing bounds.
   */
  timeRange?: {
    from: Date;
    to: Date;
  };
};
