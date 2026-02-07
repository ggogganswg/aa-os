// ./scripts/ticket-2-1-smoke.ts

/**
 * Ticket 2.1 Smoke Test — Projection Framework
 *
 * Purpose:
 * - Validate projection registry → guard → executor wiring
 * - Ensure audit fires exactly once on success
 * - Ensure audit does NOT fire when blocked
 * - Ensure the projection composition root can be constructed
 *
 * Run (PowerShell / Windows):
 *   npx tsx ./scripts/ticket-2-1-smoke.ts
 */

import { ProjectionExecutor } from "../src/projections/contracts/ProjectionExecutor";
import { ProjectionRegistry } from "../src/projections/contracts/ProjectionRegistry";
import { ProjectionGuardService } from "../src/projections/guard/ProjectionGuardService";
import { ProjectionContract } from "../src/projections/contracts/ProjectionContract";
import { ProjectionContext } from "../src/projections/contracts/ProjectionContext";
import { ProjectionInput } from "../src/projections/contracts/types";
import { createProjectionExecutor } from "../src/projections";

type TestInput = ProjectionInput;
type TestOutput = { ok: true };

function assert(condition: any, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function makeCtx(auditSpy: (e: any) => Promise<void>): ProjectionContext {
  return {
    db: {} as any, // read surface not exercised in this smoke test
    now: () => new Date("2026-02-07T00:00:00.000Z"),
    audit: auditSpy as any,
  };
}

async function test_executes_and_audits_once() {
  const auditCalls: any[] = [];

  const projection: ProjectionContract<TestInput, TestOutput> = {
    name: "session.timeline",
    sources: ["Session"],
    validate: (input) => {
      if (!input.userId) throw new Error("userId required");
    },
    run: async () => ({ ok: true }),
  };

  const executor = new ProjectionExecutor(
    new ProjectionRegistry([projection]),
    new ProjectionGuardService(),
    async () => makeCtx(async (e) => auditCalls.push(e))
  );

  const out = await executor.execute("session.timeline", { userId: "user_1" });

  assert(out.ok === true, "projection output mismatch");
  assert(auditCalls.length === 1, "audit should be called exactly once");
  assert(auditCalls[0].userId === "user_1", "audit userId mismatch");
  assert(auditCalls[0].projection === "session.timeline", "audit projection mismatch");
  assert(typeof auditCalls[0].inputsHash === "string", "inputsHash missing");
}

async function test_no_audit_when_guard_blocks() {
  const auditCalls: any[] = [];

  const projection: ProjectionContract<TestInput, TestOutput> = {
    name: "session.timeline",
    sources: ["Session"],
    validate: () => {},
    run: async () => ({ ok: true }),
  };

  class BlockingGuard extends ProjectionGuardService {
    override async check(): Promise<any> {
      return { ok: false, code: "PAUSED", message: "System is paused." };
    }
  }

  const executor = new ProjectionExecutor(
    new ProjectionRegistry([projection]),
    new BlockingGuard(),
    async () => makeCtx(async (e) => auditCalls.push(e))
  );

  let threw = false;
  try {
    await executor.execute("session.timeline", { userId: "user_1" });
  } catch (err: any) {
    threw = true;
    assert(String(err.message).includes("PAUSED"), "expected PAUSED error");
  }

  assert(threw, "executor should throw when guard blocks");
  assert(auditCalls.length === 0, "audit must not fire when guard blocks");
}

async function test_no_audit_when_validate_throws() {
  const auditCalls: any[] = [];

  const projection: ProjectionContract<TestInput, TestOutput> = {
    name: "session.timeline",
    sources: ["Session"],
    validate: () => {
      throw new Error("invalid input");
    },
    run: async () => ({ ok: true }),
  };

  const executor = new ProjectionExecutor(
    new ProjectionRegistry([projection]),
    new ProjectionGuardService(),
    async () => makeCtx(async (e) => auditCalls.push(e))
  );

  let threw = false;
  try {
    await executor.execute("session.timeline", { userId: "user_1" });
  } catch {
    threw = true;
  }

  assert(threw, "executor should throw when validate fails");
  assert(auditCalls.length === 0, "audit must not fire when validate fails");
}

function test_composition_root_constructs() {
  // This should not throw. It wires registry/guard/read DB/audit service.
  // It will execute real prisma/audit wiring only when projections run.
  const executor = createProjectionExecutor();
  assert(!!executor, "createProjectionExecutor() should return an executor");
}

async function main() {
  test_composition_root_constructs();
  await test_executes_and_audits_once();
  await test_no_audit_when_guard_blocks();
  await test_no_audit_when_validate_throws();

  // eslint-disable-next-line no-console
  console.log("Ticket 2.1 smoke tests: PASS");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Ticket 2.1 smoke tests: FAIL");
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
