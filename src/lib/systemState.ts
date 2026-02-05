import { SystemState } from "@prisma/client";

export type StateContext = {
  hasModels: boolean;      // placeholder for later (CIM/FIM existence)
  isPaused: boolean;       // from ControlFlag
};

const allowedTransitions: Record<SystemState, SystemState[]> = {
  UNINITIALIZED: ["ASSESSING", "PAUSED"],
  ASSESSING: ["MODELED", "PAUSED"],
  MODELED: ["INSIGHT_DELIVERY", "LONGITUDINAL_TRACKING", "PAUSED"],
  INSIGHT_DELIVERY: ["LONGITUDINAL_TRACKING", "PAUSED"],
  LONGITUDINAL_TRACKING: ["ASSESSING", "PAUSED"], // allows check-ins / new cycles
  PAUSED: ["UNINITIALIZED"], // resume path for v1; can be expanded later
} as const;

export function canTransition(from: SystemState, to: SystemState): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function assertTransitionAllowed(
  from: SystemState,
  to: SystemState,
  ctx: StateContext
): void {
  if (ctx.isPaused && to !== SystemState.PAUSED) {
    throw new Error("System is paused; transitions are blocked.");
  }

  // Hard rule: cannot deliver insights without models (placeholder check)
  if (to === SystemState.INSIGHT_DELIVERY && !ctx.hasModels) {
    throw new Error("Cannot enter INSIGHT_DELIVERY without identity models.");
  }

  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}
