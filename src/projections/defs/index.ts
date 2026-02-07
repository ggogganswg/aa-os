// src/projections/defs/index.ts

import { ProjectionContract } from "../contracts/ProjectionContract";

/**
 * Projection Definitions
 *
 * This module is the single authoritative collection point for all
 * ProjectionContract implementations.
 *
 * RULES:
 * - Only ProjectionContract objects belong here.
 * - No dynamic registration.
 * - No side effects.
 * - Order is not semantically meaningful; registry uses names as keys.
 *
 * NOTE:
 * Epic 2 Ticket 2.1 establishes the framework only.
 * Concrete projection implementations (session.timeline, etc.)
 * will be added in later tickets (2.2+).
 */
export const projectionDefinitions: readonly ProjectionContract<any, any>[] = [
  // Ticket 2.2+ will populate this list with concrete projection contracts.
] as const;
