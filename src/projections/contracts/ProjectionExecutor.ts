// src/projections/contracts/ProjectionExecutor.ts

import { ProjectionRegistry } from "./ProjectionRegistry";
import { ProjectionGuardService } from "../guard/ProjectionGuardService";
import { ProjectionContract } from "./ProjectionContract";
import { ProjectionContext } from "./ProjectionContext";
import { ProjectionInput, ProjectionName } from "./types";

/**
 * ProjectionExecutor
 *
 * The ONLY entry point for running projections.
 *
 * Execution order (non-negotiable):
 *  1) Resolve projection from immutable registry
 *  2) Run global guard checks (pause, ownership, structural input checks)
 *  3) Run projection-specific validate(input)
 *  4) Execute projection.run(ctx, input) using read-only capabilities
 *  5) Emit a typed audit event for access (exactly once per execution)
 *
 * HARD RULES:
 * - Executor must not mutate Epic 1 state.
 * - Executor must not trigger transitions.
 * - Audit emission is mandatory and occurs after successful run.
 */
export class ProjectionExecutor {
  constructor(
    private readonly registry: ProjectionRegistry,
    private readonly guard: ProjectionGuardService,
    /**
     * ctxFactory must provide a ProjectionContext that:
     * - exposes ONLY read operations via ctx.db
     * - can emit audit events via ctx.audit
     */
    private readonly ctxFactory: (userId: string) => Promise<ProjectionContext>
  ) {}

  async execute<I extends ProjectionInput, O>(
    name: ProjectionName,
    input: I
  ): Promise<O> {
    // 1) Resolve projection
    const projection = this.registry.get(name) as ProjectionContract<I, O>;

    // 2) Guard checks (policy + ownership + pause)
    const guardRes = await this.guard.check({ projection, input });
    if (!guardRes.ok) {
      // Expected policy blocks return structured errors from guard.
      throw new Error(`${guardRes.code}: ${guardRes.message}`);
    }

    // 3) Projection-specific validation (must throw on invalid input)
    projection.validate(input);

    // 4) Execute with read-only context
    const ctx = await this.ctxFactory(input.userId);
    const output = await projection.run(ctx, input);

    // 5) Mandatory audit emission
    await ctx.audit({
      userId: input.userId,
      sessionId: input.sessionId,
      projection: projection.name,
      inputsHash: stableHash(sanitizeInput(input)),
      sources: projection.sources,
      occurredAt: ctx.now(),
    });

    return output;
  }
}

/**
 * sanitizeInput(...)
 *
 * Inputs are sanitized before hashing so that:
 * - hashing is stable across runtime representations
 * - Date objects are represented deterministically
 * - only explicit input fields are included
 *
 * IMPORTANT:
 * - This is NOT semantic processing.
 * - This is purely structural normalization for auditing.
 */
function sanitizeInput(input: ProjectionInput): Record<string, any> {
  return {
    userId: input.userId,
    sessionId: input.sessionId ?? null,
    modelSetId: input.modelSetId ?? null,
    timeRange: input.timeRange
      ? {
          from: input.timeRange.from.toISOString(),
          to: input.timeRange.to.toISOString(),
        }
      : null,
  };
}

/**
 * stableHash(...)
 *
 * Deterministic string hash for audit correlation.
 * This avoids bringing in a dependency; replace with your preferred hash util
 * if you already have one in the codebase.
 */
function stableHash(obj: Record<string, any>): string {
  const json = stableStringify(obj);
  // Simple FNV-1a 32-bit hash (deterministic). Adequate for audit correlation.
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * stableStringify(...)
 *
 * Deterministic JSON stringify with sorted keys.
 * Prevents hash changes due to key order.
 */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
}
