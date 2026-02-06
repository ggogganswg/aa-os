/**
 * System State Machine (AA-OS)
 *
 * Purpose:
 * - Define the allowed system state transitions.
 * - Enforce prerequisite constraints (e.g., no insights without models).
 *
 * State is currently session-scoped (Session.state).
 * If AA-OS later introduces global/system-level state, this file remains the canonical
 * transition logic for session-level state, and global state would gate this layer.
 *
 * Governance constraints:
 * - State transitions must remain explicit and auditable.
 * - No module should write directly to Session.state without calling these checks.
 * - AA-OS must not become prescriptive: "INSIGHT_DELIVERY" is not "advice"; it is interpretive output.
 */

import { SystemState } from "@prisma/client";

export type StateContext = {
  /**
   * Whether identity models (CIM/FIM) exist at sufficient confidence.
   * Placeholder until EPIC 3; used to prevent premature insight delivery.
   */
  hasModels: boolean;

  /**
   * Whether the user/system is currently paused.
   * Pause is a hard governance lock across the system.
   */
  isPaused: boolean;
};

/**
 * Allowed state transitions
 *
 * Keep these explicit. Implicit transitions are a common source of "authority drift"
 * in AI systems because they create hidden pathways to action.
 */
const allowedTransitions: Record<SystemState, SystemState[]> = {
  UNINITIALIZED: ["ASSESSING", "PAUSED"],
  ASSESSING: ["MODELED", "PAUSED"],
  MODELED: ["INSIGHT_DELIVERY", "LONGITUDINAL_TRACKING", "PAUSED"],
  INSIGHT_DELIVERY: ["LONGITUDINAL_TRACKING", "PAUSED"],
  LONGITUDINAL_TRACKING: ["ASSESSING", "PAUSED"],
  PAUSED: ["UNINITIALIZED"],
};

export function canTransition(from: SystemState, to: SystemState): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

/**
 * Assert that a transition is allowed given:
 * - the current state
 * - the desired next state
 * - governance context (pause) and prerequisites (models)
 *
 * This function is the enforcement point used by API routes.
 */
export function assertTransitionAllowed(
  from: SystemState,
  to: SystemState,
  ctx: StateContext
): void {
  /**
   * Pause is a hard lock.
   * If the system is paused, transitions are blocked at the route level as well.
   * We keep this check here too as defense-in-depth.
   */
  if (ctx.isPaused && to !== SystemState.PAUSED) {
    throw new Error("System is paused; transitions are blocked.");
  }

  /**
   * No INSIGHT_DELIVERY without identity models.
   * This prevents the system from presenting interpretive outputs without sufficient grounding.
   */
  if (to === SystemState.INSIGHT_DELIVERY && !ctx.hasModels) {
    throw new Error("Cannot enter INSIGHT_DELIVERY without identity models.");
  }

  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}
