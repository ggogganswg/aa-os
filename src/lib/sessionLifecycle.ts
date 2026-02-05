import { SessionPhase } from "@prisma/client";

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
    throw new Error(`Invalid phase transition: ${from} -> ${to}`);
  }
}
