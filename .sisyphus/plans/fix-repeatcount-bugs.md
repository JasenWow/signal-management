# Fix repeatCount Logic Bugs

## TL;DR

> **Quick Summary**: Fix 5 identified bugs where `repeatCount` is ignored in overlap/boundary validation, inconsistent with `isRepeating`, has a falsy display check, and renders outside canvas bounds.
> 
> **Deliverables**:
> - Fixed overlap detection that accounts for all repeat cycles
> - Fixed frame size boundary check that accounts for repeatCount
> - Consistent `isRepeating` / `repeatCount` state with server-side validation
> - Corrected falsy check in signal-list display
> - Canvas rendering clamped to frame bounds
> - Unit tests for validation logic
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 4

---

## Context

### Original Request
User asked "repeatCount 的逻辑是否有 BUG" — after thorough code analysis, 5 bugs were identified in how `repeatCount` is validated and rendered.

### Interview Summary
**Key Discussions**:
- BUG 1 (SEVERE): Overlap detection ignores repeatCount — allows conflicting groups
- BUG 2 (SEVERE): Frame size boundary check ignores repeatCount — allows out-of-bounds groups
- BUG 3 (MEDIUM): `isRepeating` and `repeatCount` can be inconsistent — no validation
- BUG 4 (MINOR): `signal-list.tsx:149` uses falsy check instead of explicit null check
- BUG 5 (MEDIUM): Canvas renders repeated groups beyond frame bounds

**Research Findings**:
- DB schema: `repeatCount` is `integer('repeat_count')` (nullable) — schema is correct
- Types: `repeatCount: number | null`, `isRepeating: boolean` — both independent fields
- Frontend form sets `isRepeating` based on repeatCount input, but backend never validates consistency
- Flink model `SignalGroupDef` has both fields but no validation — Flink side is read-only consumer
- Test framework: `bun test` — tests co-located with source files

### Metis Review
**Identified Gaps** (addressed):
- `repeatCount` semantic ambiguity: **Decision: `repeatCount` is the source of truth. `isRepeating` is a convenience flag. When `repeatCount > 1`, `isRepeating` should be true. When `repeatCount` is null/1, `isRepeating` should be false.** → Enforced in server-side validation.
- `repeatCount=0` validity: **Decision: Not valid. Minimum is 1 or null.** → Added server-side validation.
- No max repeatCount limit: **Decision: Add reasonable max based on frame size.** → Validated via `startBit + bitWidth * repeatCount <= frameSize * 8`.
- Existing invalid data cleanup: **Decision: No migration needed. Fix validation going forward.** → Scope limited to prevention, not retroactive cleanup.

---

## Work Objectives

### Core Objective
Make `repeatCount` validation, rendering, and display correct and consistent across the entire stack.

### Concrete Deliverables
- Server-side validation that checks overlap and boundary for ALL repeat cycles
- Server-side normalization of `isRepeating` based on `repeatCount`
- Corrected display logic in signal-list
- Canvas rendering clamped to frame bounds
- Unit tests for the new validation logic

### Definition of Done
- [ ] Groups with repeatCount that would exceed frame bounds are rejected by API
- [ ] Groups with repeatCount that would overlap other groups (including repeat cycles) are rejected
- [ ] `isRepeating` is always consistent with `repeatCount` after save
- [ ] `repeatCount=0` is rejected by API
- [ ] `signal-list.tsx` correctly shows repeatCount when it's a valid number
- [ ] Canvas doesn't render rectangles outside frame bounds
- [ ] `bun test` passes

### Must Have
- All 5 bugs fixed
- Server-side validation for overlap + boundary with repeatCount
- Unit tests for validation logic
- No breaking changes to existing valid groups (repeatCount=null groups work as before)

### Must NOT Have (Guardrails)
- DO NOT modify database schema (repeatCount column is already correct)
- DO NOT modify Flink-side code (it's a read-only consumer)
- DO NOT add migration to fix existing inconsistent data (prevention only)
- DO NOT change the `group-form.tsx` form fields UX (only fix data flow if needed)
- DO NOT add `isRepeating` removal — keep the field for backward compatibility
- DO NOT over-abstract validation into a separate module — keep it inline in routes

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (`bun test`)
- **Automated tests**: YES (Tests-after — server validation logic benefits from unit tests)
- **Framework**: bun test
- **Test scope**: Server validation logic only (pure validation functions extracted for testability)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **UI/Frontend**: Use Playwright — Navigate, assert DOM elements
- **Tests**: Use Bash (`bun test`) — Run and verify pass/fail

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — backend validation fixes):
├── Task 1: Fix overlap detection to account for repeatCount [deep]
├── Task 2: Fix frame boundary check to account for repeatCount [quick]
└── Task 3: Add isRepeating/repeatCount consistency normalization [quick]

Wave 2 (After Wave 1 — frontend fixes, can be parallel):
├── Task 4: Fix signal-list.tsx falsy check [quick]
├── Task 5: Fix bit-canvas.tsx rendering overflow [quick]
└── Task 6: Add unit tests for server validation logic [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 6 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 6 |
| 2 | - | 6 |
| 3 | - | 6 |
| 4 | - | F1-F4 |
| 5 | - | F1-F4 |
| 6 | 1, 2, 3 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `deep`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **3** — T4 → `quick`, T5 → `quick`, T6 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Fix overlap detection to account for repeatCount

  **What to do**:
  - In `server/routes/signal-groups.ts`, modify the overlap detection logic in POST `/messages/:messageId/groups` (lines 35-43) and PUT `/groups/:id` (lines 93-109) and POST `/groups/:id/validate` (lines 144-153)
  - Compute effective end bit for each group: `effectiveEndBit = startBit + bitWidth * (repeatCount ?? 1)`
  - Two groups overlap if: `groupA.startBit < groupB.effectiveEndBit AND groupB.startBit < groupA.effectiveEndBit`
  - Also need to compute effective end bit for the *existing* groups in DB — read their `repeatCount` and apply the same formula
  - This means the SQL-based overlap check may need to become a hybrid approach: fetch candidate groups within range, then compute effective overlap in JS
  - Add server-side validation: `repeatCount` must be `null`, `undefined`, or `>= 1` (reject `repeatCount=0`)
  - Keep the existing SQL query as a first-pass filter (broad range), then do precise JS check for cycle-by-cycle overlap

  **Must NOT do**:
  - Do not modify database schema
  - Do not change the Flink model
  - Do not remove the existing SQL overlap check entirely — keep it as a fast first-pass filter

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding existing SQL overlap logic and carefully extending it to handle multi-cycle computation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `server/routes/signal-groups.ts:35-43` — Current overlap check SQL for POST create. Uses `lt(signalGroups.startBit, body.startBit + body.bitWidth)` and `gt(sql\`${signalGroups.startBit} + ${signalGroups.bitWidth}\`, body.startBit)`. This checks if any existing group's range [startBit, startBit+bitWidth) overlaps with new group's range. Extend this to use `bitWidth * (repeatCount ?? 1)` instead of just `bitWidth`.
  - `server/routes/signal-groups.ts:93-109` — Same overlap check for PUT update. Same logic, just uses merged `startBit`/`bitWidth` from body + existing. Apply same fix.
  - `server/routes/signal-groups.ts:144-153` — Overlap check for validate endpoint. Same fix.

  **API/Type References**:
  - `src/foundation/types.ts:SignalGroup` — `repeatCount: number | null`, `isRepeating: boolean`
  - `server/db/schema.ts:56` — `repeatCount: integer('repeat_count')` (nullable)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Overlap detection catches cross-cycle collision
    Tool: Bash (curl)
    Preconditions: Dev server running, message with id "test-msg" and frameSize=8 (64 bits) exists
    Steps:
      1. Create group A: curl -X POST /api/messages/test-msg/groups -d '{"name":"A","startBit":0,"bitWidth":8,"repeatCount":4,"color":"#FF0000"}'
         Expected: 201 Created
      2. Create group B that overlaps with A's 4th cycle (bits 24-31): curl -X POST /api/messages/test-msg/groups -d '{"name":"B","startBit":24,"bitWidth":8,"color":"#00FF00"}'
         Expected: 409 Conflict with error "Group region overlaps with existing groups"
    Expected Result: Second group creation is rejected with 409
    Failure Indicators: 201 returned for group B (overlap not detected)
    Evidence: .sisyphus/evidence/task-1-overlap-cross-cycle.txt

  Scenario: Overlap detection catches existing repeating group overlapping new group
    Tool: Bash (curl)
    Preconditions: Dev server running, message with id "test-msg" and frameSize=8
    Steps:
      1. Create group A: curl -X POST /api/messages/test-msg/groups -d '{"name":"A","startBit":16,"bitWidth":8,"repeatCount":3,"color":"#FF0000"}'
         Expected: 201 Created (covers bits 16-39)
      2. Create group B at bit 0 with repeatCount=3: curl -X POST /api/messages/test-msg/groups -d '{"name":"B","startBit":0,"bitWidth":16,"repeatCount":2,"color":"#00FF00"}'
         Expected: 409 Conflict (B's 2nd cycle at bits 16-31 overlaps A's 1st cycle at bits 16-23)
    Expected Result: Second group rejected with 409
    Failure Indicators: 201 returned for group B
    Evidence: .sisyphus/evidence/task-1-overlap-repeating-existing.txt

  Scenario: Non-overlapping repeating groups are allowed
    Tool: Bash (curl)
    Preconditions: Dev server running, message with id "test-msg" and frameSize=8
    Steps:
      1. Create group A: curl -X POST /api/messages/test-msg/groups -d '{"name":"A","startBit":0,"bitWidth":8,"repeatCount":4,"color":"#FF0000"}'
         Expected: 201 Created (covers bits 0-31)
      2. Create group B at bit 32: curl -X POST /api/messages/test-msg/groups -d '{"name":"B","startBit":32,"bitWidth":8,"repeatCount":4,"color":"#00FF00"}'
         Expected: 201 Created (covers bits 32-63, no overlap)
    Expected Result: Both groups created successfully
    Failure Indicators: 409 for group B
    Evidence: .sisyphus/evidence/task-1-no-overlap-allowed.txt

  Scenario: repeatCount=0 is rejected
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Create group with repeatCount=0: curl -X POST /api/messages/test-msg/groups -d '{"name":"Bad","startBit":0,"bitWidth":8,"repeatCount":0,"color":"#FF0000"}'
         Expected: 400 Bad Request with error about invalid repeatCount
    Expected Result: 400 status, error message mentions repeatCount
    Failure Indicators: 201 returned
    Evidence: .sisyphus/evidence/task-1-repeatcount-zero-rejected.txt
  ```

  **Commit**: YES (groups with Task 2, 3)
  - Message: `fix(server): account for repeatCount in group overlap and boundary validation`
  - Files: `server/routes/signal-groups.ts`
  - Pre-commit: `bun test`

- [x] 2. Fix frame size boundary check to account for repeatCount

  **What to do**:
  - In `server/routes/signal-groups.ts`, modify the frame size check at line 30 (POST) and line 89 (PUT)
  - Change `body.startBit + body.bitWidth > msg.frameSize * 8` to `body.startBit + body.bitWidth * (body.repeatCount ?? 1) > msg.frameSize * 8`
  - This ensures a repeating group's total span fits within the frame

  **Must NOT do**:
  - Do not change the error message format
  - Do not modify the frameSize field itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line logic fix in two locations
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `server/routes/signal-groups.ts:30` — Current check: `if (body.startBit + body.bitWidth > msg.frameSize * 8)`. Change to use effective width.
  - `server/routes/signal-groups.ts:89` — Same check for PUT update: `if (msg && startBit + bitWidth > msg.frameSize * 8)`. Change to use effective width.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Repeating group exceeding frame size is rejected
    Tool: Bash (curl)
    Preconditions: Dev server running, message with frameSize=4 (32 bits)
    Steps:
      1. Create group: curl -X POST /api/messages/test-msg/groups -d '{"name":"Overflow","startBit":16,"bitWidth":8,"repeatCount":3,"color":"#FF0000"}'
         Expected: 400 Bad Request, error "Group region exceeds frame size"
         Reason: 16 + 8*3 = 40 > 32
    Expected Result: 400 status with frame size error
    Failure Indicators: 201 returned
    Evidence: .sisyphus/evidence/task-2-frame-overflow-rejected.txt

  Scenario: Repeating group exactly at frame boundary is allowed
    Tool: Bash (curl)
    Preconditions: Dev server running, message with frameSize=8 (64 bits)
    Steps:
      1. Create group: curl -X POST /api/messages/test-msg/groups -d '{"name":"ExactFit","startBit":0,"bitWidth":16,"repeatCount":4,"color":"#FF0000"}'
         Expected: 201 Created
         Reason: 0 + 16*4 = 64 == 64
    Expected Result: 201 Created
    Failure Indicators: 400 returned
    Evidence: .sisyphus/evidence/task-2-exact-boundary-allowed.txt
  ```

  **Commit**: YES (groups with Task 1, 3)
  - Message: `fix(server): account for repeatCount in group overlap and boundary validation`
  - Files: `server/routes/signal-groups.ts`
  - Pre-commit: `bun test`

- [x] 3. Add isRepeating/repeatCount consistency normalization

  **What to do**:
  - In `server/routes/signal-groups.ts`, add normalization before saving in POST (line 62) and PUT (line 112):
    - If `repeatCount` is provided and `> 1`, set `isRepeating = true`
    - If `repeatCount` is `null`, `undefined`, or `1`, set `isRepeating = false`
    - If `repeatCount` is provided and `< 1` (but not null/undefined), reject with 400
  - This ensures `isRepeating` is always a derived/inferred value from `repeatCount`, never inconsistent

  **Must NOT do**:
  - Do not remove the `isRepeating` field from the schema or types
  - Do not modify the group form UI
  - Do not add data migration for existing records

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small logic addition in two locations
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `server/routes/signal-groups.ts:62-69` — POST insert values. Currently uses `isRepeating: body.isRepeating ?? false`. Change to derive from repeatCount.
  - `server/routes/signal-groups.ts:112-121` — PUT update set. Currently spreads `isRepeating` from body. Change to derive from repeatCount.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: isRepeating is auto-set to true when repeatCount > 1
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Create group with repeatCount=3 but isRepeating=false: curl -X POST /api/messages/test-msg/groups -d '{"name":"Test","startBit":0,"bitWidth":8,"repeatCount":3,"isRepeating":false,"color":"#FF0000"}'
         Expected: 201 Created
      2. Fetch the created group and verify `isRepeating` is `true`
    Expected Result: Returned group has `isRepeating: true`
    Failure Indicators: `isRepeating: false` in response
    Evidence: .sisyphus/evidence/task-3-auto-isrepeating-true.txt

  Scenario: isRepeating is auto-set to false when repeatCount is null
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Create group without repeatCount: curl -X POST /api/messages/test-msg/groups -d '{"name":"Test","startBit":0,"bitWidth":8,"isRepeating":true,"color":"#FF0000"}'
         Expected: 201 Created
      2. Fetch and verify `isRepeating` is `false`
    Expected Result: Returned group has `isRepeating: false`
    Failure Indicators: `isRepeating: true` in response
    Evidence: .sisyphus/evidence/task-3-auto-isrepeating-false.txt
  ```

  **Commit**: YES (groups with Task 1, 2)
  - Message: `fix(server): account for repeatCount in group overlap and boundary validation`
  - Files: `server/routes/signal-groups.ts`
  - Pre-commit: `bun test`

- [x] 4. Fix signal-list.tsx falsy check for repeatCount

  **What to do**:
  - In `src/domains/signal/components/signal-list.tsx:149`, change `group.repeatCount ? ...` to `group.repeatCount != null ? ...`
  - This ensures `repeatCount=0` edge case would be displayed (though it's now rejected by API, defensive coding is good)
  - Also consider displaying for `repeatCount >= 2` only (since repeatCount=1 is a single occurrence), but keep current behavior for now — just fix the falsy check

  **Must NOT do**:
  - Do not change the display format (keep `x${repeatCount}`)
  - Do not add new display logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single character fix
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/domains/signal/components/signal-list.tsx:149` — Current: `{group.repeatCount ? \`x${group.repeatCount} · \` : ''}`. Change to `{group.repeatCount != null ? \`x${group.repeatCount} · \` : ''}`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Group with repeatCount=null does not show repeat badge
    Tool: Playwright
    Preconditions: App running, group exists with repeatCount=null
    Steps:
      1. Navigate to signal list page
      2. Find the group in the list
      3. Assert group name does NOT contain "x" prefix
    Expected Result: No "x" badge shown for non-repeating group
    Failure Indicators: "x" shown for null repeatCount
    Evidence: .sisyphus/evidence/task-4-null-no-badge.png

  Scenario: Group with repeatCount=3 shows "x3" badge
    Tool: Playwright
    Preconditions: App running, group exists with repeatCount=3
    Steps:
      1. Navigate to signal list page
      2. Find the group in the list
      3. Assert group detail contains "x3"
    Expected Result: "x3" badge visible next to group name
    Failure Indicators: Badge missing or wrong value
    Evidence: .sisyphus/evidence/task-4-repeatcount-badge.png
  ```

  **Commit**: YES
  - Message: `fix(ui): use explicit null check for repeatCount display in signal-list`
  - Files: `src/domains/signal/components/signal-list.tsx`
  - Pre-commit: (none — UI component)

- [x] 5. Fix bit-canvas.tsx rendering overflow for repeated groups

  **What to do**:
  - In `src/domains/signal/components/bit-canvas.tsx:78-95`, add bounds checking in the repeat loop
  - Before rendering each cycle's rectangle, check if `cycleStartBit` exceeds `frameSize * 8`
  - If it does, break out of the loop (don't render cycles beyond frame bounds)
  - Optionally show a visual indicator (like a clipped border) if the group extends beyond the visible area

  **Must NOT do**:
  - Do not change the rectangle rendering math
  - Do not add scrolling or canvas resizing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small bounds-check addition in existing loop
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/domains/signal/components/bit-canvas.tsx:78-95` — Current loop: `for (let i = 0; i < repeatCount; i++)` with no bounds check. Add: `if (cycleStartBit >= frameSize * 8) break;` after computing `cycleStartBit` at line 82.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Repeated group rendering stays within canvas bounds
    Tool: Playwright
    Preconditions: App running, group with repeatCount that would extend beyond frame
    Steps:
      1. Navigate to canvas view
      2. Take screenshot of canvas
      3. Verify no SVG rectangles extend beyond canvas border
    Expected Result: All group rectangles are within the visible canvas area
    Failure Indicators: Rectangles rendered outside the canvas SVG boundary
    Evidence: .sisyphus/evidence/task-5-canvas-bounded.png

  Scenario: Group with repeatCount=1 renders single rectangle
    Tool: Playwright
    Preconditions: App running, group with repeatCount=1 or null
    Steps:
      1. Navigate to canvas view
      2. Count group boundary rectangles
      3. Verify exactly 1 rectangle for the group
    Expected Result: Single rectangle rendered
    Failure Indicators: Multiple rectangles or missing rectangle
    Evidence: .sisyphus/evidence/task-5-single-rect.png
  ```

  **Commit**: YES
  - Message: `fix(ui): clamp repeated group rendering to frame bounds in bit-canvas`
  - Files: `src/domains/signal/components/bit-canvas.tsx`
  - Pre-commit: (none — UI component)

- [x] 6. Add unit tests for server validation logic

  **What to do**:
  - Create test file `server/routes/signal-groups.test.ts`
  - Follow the project's unit test conventions from `contributing/unit-test.md`
  - Test cases to cover:
    1. Overlap detection with repeatCount: two groups that overlap only in later cycles are detected
    2. Overlap detection without repeatCount: existing behavior preserved
    3. Frame boundary with repeatCount: group exceeding frame rejected
    4. Frame boundary exact fit: group exactly at boundary accepted
    5. repeatCount=0 rejected
    6. repeatCount=null accepted, isRepeating=false
    7. repeatCount=3 with isRepeating=false → normalized to isRepeating=true
    8. Negative repeatCount rejected
  - Extract validation logic into testable pure functions if needed (e.g., `computeEffectiveEndBit`, `checkGroupOverlap`)

  **Must NOT do**:
  - Do not create integration tests that hit the real database
  - Do not test UI components in this task

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple test cases with careful edge case coverage
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1, 2, 3 (need the fixed validation logic to exist)

  **References**:

  **Pattern References**:
  - `server/routes/signal-groups.ts` — The file being tested. Tests should validate the overlap/boundary/consistency logic.
  - `contributing/unit-test.md` — Project's test conventions. Co-locate test files with source. Use `bun test`.
  - `src/foundation/types.test.ts` — Example test file in the project for pattern reference.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All unit tests pass
    Tool: Bash
    Preconditions: Tasks 1-3 complete
    Steps:
      1. Run: bun test server/routes/signal-groups.test.ts
      2. Assert all tests pass
    Expected Result: 0 failures, all test cases pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-6-unit-tests-pass.txt

  Scenario: Full test suite still passes
    Tool: Bash
    Steps:
      1. Run: bun test
      2. Assert all tests pass (no regressions)
    Expected Result: 0 failures across entire suite
    Failure Indicators: Any pre-existing test breaks
    Evidence: .sisyphus/evidence/task-6-full-suite-pass.txt
  ```

  **Commit**: YES
  - Message: `test(server): add unit tests for repeatCount validation logic`
  - Files: `server/routes/signal-groups.test.ts`
  - Pre-commit: `bun test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle` — APPROVE
  Must Have [7/7] | Must NOT Have [6/6] | Tasks [6/6] | VERDICT: APPROVE

- [x] F2. **Code Quality Review** — `unspecified-high` — APPROVE
  Tests [34 pass/0 fail] | Files [4 clean] | VERDICT: APPROVE

- [x] F3. **Real Manual QA** — `unspecified-high` — PARTIAL PASS (fixed overlap bug)
  Scenarios [3/4 pass, 1 FAIL → FIXED] | Integration [PASS] | Edge Cases [tested] | VERDICT: APPROVE (after fix)

- [x] F4. **Scope Fidelity Check** — `deep` — APPROVE
  Tasks [6/6 compliant] | Contamination [CLEAN] | Unaccounted [CLEAN] | VERDICT: APPROVE

---

## Commit Strategy

- **Task 1+2+3** (backend): `fix(server): account for repeatCount in group overlap and boundary validation` — `server/routes/signal-groups.ts`
- **Task 4** (display): `fix(ui): use explicit null check for repeatCount display in signal-list` — `src/domains/signal/components/signal-list.tsx`
- **Task 5** (canvas): `fix(ui): clamp repeated group rendering to frame bounds in bit-canvas` — `src/domains/signal/components/bit-canvas.tsx`
- **Task 6** (tests): `test(server): add unit tests for repeatCount validation logic` — `server/routes/signal-groups.test.ts`

---

## Success Criteria

### Verification Commands
```bash
bun test                                          # Expected: all tests pass
bun test server/routes/signal-groups.test.ts      # Expected: repeatCount tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Overlap detection works for repeat cycles
- [ ] Frame boundary works for repeat cycles
- [ ] isRepeating and repeatCount are always consistent
- [ ] Canvas rendering stays within bounds
