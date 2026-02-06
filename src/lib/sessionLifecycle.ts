/**
 * Session Lifecycle Rules (AA-OS)
 *
 * Purpose:
 * - Define the allowed session phase transitions for AA-OS.
 * - Provide a single source of truth that route handlers must enforce.
 *
 * Design intent:
 * - Sessions are structured containers for a coherent interaction arc.
 * - Phase order reduces chaos and supports psychological safety:
 *   OPENING → ENGAGEMENT → SYNTHESIS → CLOSURE
 *
 * Governance constraints:
 * - No route may bypass these rules by writing directly to Session.phase.
 * - If phases change in the future, update this file first, then update routes + tests.
 */

import { SessionPhase } from "@prisma/client";

/**
 * Allowed phase transitions
 *
 * Keep this explicit (not "any next enum"), because explicitness prevents drift.
 * If you add a new phase, you MUST also define its allowed transitions here.
 */
const allowedPhaseTransitions: Record<SessionPhase, SessionPhase[]> = {
  OPENING: ["ENGAGEMENT"],
  ENGAGEMENT: ["SYNTHESIS"],
  SYNTHESIS: ["CLOSURE"],
  CLOSURE: [],
};

export function canAdvancePhase(from: SessionPhase, to: SessionPhase): boolean {
  return allowedPhaseTransitions[from]?.includes(to) ?? false;
}

export function assertPhaseAdvanceAllowed(from: SessionPhase, to: SessionPhase) {
  if (!canAdvancePhase(from, to)) {
    // Keep error messages consistent; callers rely on these during integration/testing.
    throw new Error(`Invalid phase transition: ${from} -> ${to}`);
  }
}
