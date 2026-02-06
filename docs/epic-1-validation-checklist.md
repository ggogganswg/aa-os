# AA-OS — Epic 1 Validation Checklist (Core System Foundation)

Date:
Commit/Tag:

## Scope reminder (Epic 1)
- No insights
- No prompts
- No UI polish
- Structural correctness + governance only

---

## 1) Session boundaries
- [ ] Sessions can be created deterministically (OPENING + UNINITIALIZED).
- [ ] Session phases enforce valid transitions.
- [ ] Closure is mandatory before a session is considered closed.
- [ ] Closed sessions reject input / cannot be advanced.

Evidence (links / command outputs):

---

## 2) System state machine
- [ ] Only one system state is active at a time.
- [ ] Transitions are explicit and logged.
- [ ] Invalid transitions are blocked.
- [ ] No “implicit” state changes occur during routes/services.

Evidence:

---

## 3) UserContext + Identity Anchor (Ticket 1.3)
- [ ] `UserContext` exists per user (idempotent create).
- [ ] `contextVersion` increments on reset.
- [ ] `lastClosedSessionId` only points to a closed session (CLOSURE + closedAt).
- [ ] `activeModelSetId` ownership enforced (ModelSet.userId must match).
- [ ] No raw user content stored in UserContext.

Evidence:
- [ ] `scripts/ticket-1-3-smoke.ts` passes

---

## 4) Identity model storage + versioning (Ticket 1.4)
- [ ] Identity versions are append-only (no overwrite).
- [ ] Version numbers are deterministic per (modelSetId, type).
- [ ] Ownership enforced: user must own the ModelSet.
- [ ] Payload is structure-only JSON (no transcript blobs).
- [ ] ModelSets are durable containers for CIM/FIM versions.

Evidence:
- [ ] `scripts/ticket-1-4-smoke.ts` passes

---

## 5) Confidence state tracking (Ticket 1.5)
- [ ] Confidence records are append-only.
- [ ] Latest confidence is derived by createdAt desc (no mutation).
- [ ] Confidence value bounded to [0.0, 1.0].
- [ ] Confidence is not used to generate insight in Epic 1.

Evidence:
- [ ] `scripts/ticket-1-5-smoke.ts` passes

---

## 6) Pressure state tracking (Ticket 1.6)
- [ ] Pressure records are append-only.
- [ ] DPI bounded to [0, 100].
- [ ] PressureLevel derived deterministically from DPI.
- [ ] Pressure does not generate recommendations in Epic 1.

Evidence:
- [ ] `scripts/ticket-1-6-smoke.ts` passes

---

## 7) Transition guardrails (Ticket 1.7)
- [ ] PAUSED overrides all transitions (except entering PAUSED).
- [ ] INSIGHT_DELIVERY blocked unless:
  - [ ] UserContext exists
  - [ ] activeModelSetId exists
  - [ ] Active ModelSet has >= 1 identity version
- [ ] Interpretation is blocked during ASSESSING.
- [ ] Guards are central and callable.

Evidence:
- [ ] `scripts/ticket-1-7-smoke.ts` passes

---

## 8) Audit & trace logging (Ticket 1.8)
- [ ] Audit events are enum-typed (AuditEventType).
- [ ] Audit meta is structure-only (no raw user content).
- [ ] Key lifecycle and mutation events are audited.
- [ ] Manual migration (enum conversion) is applied and recorded.

Evidence:
- [ ] `npx tsc -p tsconfig.json --noEmit` passes
- [ ] AuditEventType enum present in DB + client

---

## 9) Manual pause / kill switch (Ticket 1.9)
- [ ] User-level pause blocks transitions.
- [ ] System-level pause blocks transitions for all users.
- [ ] Latest-flag-wins logic works.
- [ ] Transition guard uses effective pause (system OR user).
- [ ] Pause/resume actions are audited.

Evidence:
- [ ] `scripts/ticket-1-9-smoke.ts` passes

---

## 10) No inference possible (Epic 1 hard constraint)
- [ ] No code path computes “progress,” “readiness,” “alignment,” or “traits.”
- [ ] No LLM/OpenAI integration exists.
- [ ] No derived identity truth is stored.
- [ ] No route returns interpretive payloads.

Evidence:

---

## Epic 1 Sign-off
- [ ] All sections above satisfied
- [ ] All smoke tests pass
- [ ] All migrations applied cleanly
- [ ] System remains bounded and stateful

Signed by:
Notes:
