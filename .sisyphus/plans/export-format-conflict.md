# Fix Export Format Conflict & Update Flink Repeating Group Expansion

## TL;DR

> **Quick Summary**: Fix the data export/import format to preserve `repeatCount` for signal groups, and update the Flink `SignalParser` to expand repeating groups at parse time with `SignalName_1, SignalName_2, ...` naming.
> 
> **Deliverables**:
> - Export format includes `repeatCount` in signalGroups (2 locations)
> - Import endpoint accepts and persists `repeatCount`
> - Flink `SignalParser` expands repeating groups with suffixed signal names
> - Test coverage for repeating group parsing (JUnit + test spec)
> - TypeScript unit tests for export/import round-trip with repeatCount
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves + final verification
> **Critical Path**: Task 1 (export fix) → Task 4 (import test) → Task 6 (Flink TDD) → Task 8 (Flink impl)

---

## Context

### Original Request
User requested audit of data export format vs current design for conflicts in signal_group and repeat_count, fix the export format, then re-check Flink logic.

### Interview Summary
**Key Discussions**:
- 5 conflicts found between export format, import endpoint, and Flink parser
- User chose Flink-side expansion of repeating groups (not export-time flattening)
- Signal naming convention: `OriginalName_1, OriginalName_2, OriginalName_N`
- TDD approach for Flink parser changes

**Research Findings**:
- DB schema has `repeat_count INTEGER` nullable, already correct
- TypeScript type has `repeatCount: number | null`, already correct
- Export format (2 locations) omits `repeatCount` — needs fix
- Import endpoint hardcodes `repeatCount: null` — needs fix
- Flink parser completely ignores signalGroups — needs expansion logic
- No test coverage for signal groups in Flink — needs tests

### Metis Review
**Identified Gaps** (all addressed):
- repeatCount=0/edge cases: Backend validates >= 1, no extra work needed
- Backward compatibility: Jackson `@JsonIgnoreProperties` handles new fields
- repeatCount=1 behavior: Treat as non-repeating (isRepeating = repeatCount > 1)
- Name collision in Flink output: Edge case, v1 no special handling needed

---

## Work Objectives

### Core Objective
Ensure complete data round-trip integrity for signal groups with `repeatCount`, and enable Flink to correctly parse all repetitions of repeating signal groups.

### Concrete Deliverables
- `message-editor.tsx`: Export includes `repeatCount`
- `version-panel.tsx`: Export includes `repeatCount`
- `server/routes/messages.ts`: Import accepts and persists `repeatCount`
- `SignalParser.java`: Expands repeating groups at parse time
- `test-spec.json`: Test spec with repeating group
- `SignalParserTest.java`: Tests for repeating group expansion

### Definition of Done
- [ ] Export JSON includes `repeatCount` in signalGroups (both export locations)
- [ ] Import preserves `repeatCount` through full round-trip
- [ ] Flink parser outputs N instances for group with repeatCount=N
- [ ] Signal names correctly suffixed: `Name_1, Name_2, ...`
- [ ] Non-repeating signals unchanged
- [ ] All existing tests still pass

### Must Have
- `repeatCount` field present in export JSON for every signalGroup
- Import endpoint uses `repeatCount` from import data (not hardcoded null)
- Flink parser handles groups with repeatCount >= 2
- repeatCount <= 1 treated as non-repeating (no suffix, no expansion)
- First instance of repeating signal gets `_1` suffix

### Must NOT Have (Guardrails)
- Do NOT modify DB schema — already has `repeat_count` column
- Do NOT change TypeScript `SignalGroup` interface — already has `repeatCount`
- Do NOT change non-repeating signal behavior — backward compatible
- Do NOT add new API endpoints — fix existing import only
- Do NOT change Parquet output schema — only signal values change
- Do NOT add AI-slop: excessive comments, over-abstraction, defensive checks for impossible states
- Do NOT modify signal management UI — only backend/export logic
- Do NOT touch version snapshot/rollback logic — already handles repeatCount

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (TDD)
- **Framework**: JUnit 5 (Flink/Java), bun test (TypeScript)
- **TDD**: RED (failing test) → GREEN (minimal impl) → REFACTOR for each feature

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Flink/Java**: Use Bash (`mvn test`) - Run tests, assert pass/fail
- **TypeScript**: Use Bash (`bun test`) - Run tests, assert pass/fail
- **API**: Use Bash (curl) - Send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - export/import fixes + Flink TDD):
├── Task 1: Fix message-editor.tsx export format [quick]
├── Task 2: Fix version-panel.tsx export format [quick]
├── Task 3: Fix import endpoint to accept repeatCount [quick]
├── Task 4: Add TypeScript round-trip test for repeatCount [quick]
├── Task 5: Write Flink test spec with repeating group [quick]
├── Task 6: Write failing Flink SignalParser tests for group expansion [unspecified-high]

Wave 2 (After Wave 1 - Flink implementation):
├── Task 7: Implement Flink SignalParser group expansion [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 5 → Task 6 → Task 7 → Final Wave
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 4, F1-F4 | 1 |
| 2 | - | 4, F1-F4 | 1 |
| 3 | - | 4, F1-F4 | 1 |
| 4 | 1, 2, 3 | F1-F4 | 1 |
| 5 | - | 6, 7 | 1 |
| 6 | 5 | 7 | 1 |
| 7 | 5, 6 | F1-F4 | 2 |

### Agent Dispatch Summary

- **Wave 1**: **6** - T1-T5 → `quick`, T6 → `unspecified-high`
- **Wave 2**: **1** - T7 → `deep`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Fix message-editor.tsx export to include repeatCount

  **What to do**:
  - Open `src/domains/message/components/message-editor.tsx`
  - In the `handleExport()` function (lines 48-56), add `repeatCount: g.repeatCount` to the signalGroups map
  - The map currently produces: `{ name, description, startBit, bitWidth, isRepeating, color, sortOrder }`
  - After fix: `{ name, description, startBit, bitWidth, isRepeating, repeatCount, color, sortOrder }`
  - `repeatCount` can be `number | null` — both should serialize correctly (null stays null in JSON)

  **Must NOT do**:
  - Do NOT change non-grouped signal export format
  - Do NOT add any transformation or validation — just pass through the value
  - Do NOT add comments explaining the change

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single field addition in one map function
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Task 4 (round-trip test), Final verification
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/domains/message/components/message-editor.tsx:48-56` — Current signalGroups map. Add `repeatCount: g.repeatCount` between `isRepeating` and `color` fields to match logical grouping.

  **API/Type References** (contracts to implement against):
  - `src/foundation/types.ts:39-52` — `SignalGroup` interface showing `repeatCount: number | null`. This is the source of truth for the field type.

  **WHY Each Reference Matters**:
  - `message-editor.tsx:48-56`: This is the EXACT location to modify — the map function producing export data
  - `types.ts:39-52`: Confirms the field name is `repeatCount` (camelCase) and type is `number | null`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Export JSON includes repeatCount for signal groups
    Tool: Bash (grep)
    Preconditions: message-editor.tsx has been modified
    Steps:
      1. grep -n "repeatCount" src/domains/message/components/message-editor.tsx
      2. Verify the line shows "repeatCount: g.repeatCount" in the signalGroups map
    Expected Result: Line found with correct field assignment within the map callback
    Failure Indicators: No match or match in wrong location
    Evidence: .sisyphus/evidence/task-1-export-repeatcount.txt
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `fix(export): add repeatCount to signalGroups in export format`
  - Files: `src/domains/message/components/message-editor.tsx`

- [x] 2. Fix version-panel.tsx export to include repeatCount

  **What to do**:
  - Open `src/domains/version/components/version-panel.tsx`
  - In the `handleExport()` function (lines 155-163), add `repeatCount: g.repeatCount` to the signalGroups map
  - Same pattern as Task 1 — the version panel has its own export function that also omits repeatCount

  **Must NOT do**:
  - Do NOT change non-grouped signal export format
  - Do NOT add comments
  - Do NOT refactor to share export logic between the two components (separate concern)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Identical to Task 1, single field addition
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Task 4 (round-trip test), Final verification
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/domains/version/components/version-panel.tsx:155-163` — Current signalGroups map. Add `repeatCount: g.repeatCount` between `isRepeating` and `color` fields.
  - `src/domains/message/components/message-editor.tsx` — Task 1 applies the SAME pattern. Use as reference if Task 1 is already done.

  **API/Type References**:
  - `src/foundation/types.ts:39-52` — `SignalGroup` interface with `repeatCount: number | null`

  **WHY Each Reference Matters**:
  - `version-panel.tsx:155-163`: Exact location to modify
  - `message-editor.tsx`: Reference for identical pattern (if Task 1 done first)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Version export JSON includes repeatCount
    Tool: Bash (grep)
    Preconditions: version-panel.tsx has been modified
    Steps:
      1. grep -n "repeatCount" src/domains/version/components/version-panel.tsx
      2. Verify line shows "repeatCount: g.repeatCount" in signalGroups map
    Expected Result: Line found in the handleExport function's signalGroups map
    Failure Indicators: No match or wrong location
    Evidence: .sisyphus/evidence/task-2-version-export-repeatcount.txt
  ```

  **Commit**: YES (groups with Tasks 1, 3)
  - Message: `fix(export): add repeatCount to signalGroups in export format`
  - Files: `src/domains/version/components/version-panel.tsx`

- [x] 3. Fix import endpoint to accept and persist repeatCount

  **What to do**:
  - Open `server/routes/messages.ts`
  - **Part A**: Update the TypeScript type definition for `signalGroups` in the import body (lines 96-99):
    - Add `repeatCount?: number | null` to the accepted fields
  - **Part B**: Update the insert statement (line 120-127):
    - Change `repeatCount: null` to `repeatCount: g.repeatCount ?? null`
    - This reads repeatCount from import data, defaulting to null if not provided
  - This fixes the hardcoded `repeatCount: null` that always discards the value

  **Must NOT do**:
  - Do NOT add validation for repeatCount in import — existing backend validation in signal-groups.ts handles this on subsequent edits
  - Do NOT change the signal import logic (Pass 2)
  - Do NOT add new API endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small changes in one file — type def + one line in insert
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: Task 4 (round-trip test), Final verification
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `server/routes/messages.ts:96-99` — Current signalGroups type definition. Add `repeatCount?: number | null` field.
  - `server/routes/messages.ts:120-127` — Current insert statement. Change line 124 from `repeatCount: null` to `repeatCount: g.repeatCount ?? null`.

  **API/Type References**:
  - `server/db/schema.ts:48-63` — DB schema for signal_groups with `repeatCount` (integer, nullable)
  - `src/foundation/types.ts:39-52` — TypeScript SignalGroup interface

  **Test References**:
  - `server/routes/signal-groups.test.ts` — Existing test patterns for signal group API

  **WHY Each Reference Matters**:
  - `messages.ts:96-99`: The type definition that needs the new field
  - `messages.ts:120-127`: The insert that hardcodes null — must use imported value
  - `schema.ts:48-63`: Confirms DB column exists and accepts nullable integer
  - `signal-groups.test.ts`: Test patterns for reference (but this task doesn't add tests here)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Import with repeatCount preserves value
    Tool: Bash (curl)
    Preconditions: Server is running (bun run server/index.ts)
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/import -H "Content-Type: application/json" -d '{"message":{"name":"TestImport","frameSize":8},"signalGroups":[{"name":"TestGroup","startBit":0,"bitWidth":16,"repeatCount":4,"isRepeating":true}],"signals":[]}'
      2. Parse response, get the message ID
      3. curl http://localhost:3000/api/signal-groups?messageId=<ID>
      4. Check response signalGroups[0].repeatCount === 4
    Expected Result: repeatCount=4 preserved in database
    Failure Indicators: repeatCount is null or missing
    Evidence: .sisyphus/evidence/task-3-import-repeatcount.json

  Scenario: Import without repeatCount defaults to null
    Tool: Bash (curl)
    Preconditions: Server is running
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/import -H "Content-Type: application/json" -d '{"message":{"name":"TestImportNull","frameSize":8},"signalGroups":[{"name":"TestGroupNull","startBit":0,"bitWidth":16}],"signals":[]}'
      2. Get message ID from response
      3. curl http://localhost:3000/api/signal-groups?messageId=<ID>
      4. Check signalGroups[0].repeatCount === null
    Expected Result: repeatCount=null when not provided (backward compatible)
    Failure Indicators: repeatCount is undefined or 0
    Evidence: .sisyphus/evidence/task-3-import-null-default.json
  ```

  **Commit**: YES (groups with Tasks 1, 2)
  - Message: `fix(export): add repeatCount to signalGroups in export format`
  - Files: `server/routes/messages.ts`

- [x] 4. Add TypeScript round-trip test for repeatCount preservation

  **What to do**:
  - Add a test that verifies the full export → import round-trip preserves repeatCount
  - Follow existing test patterns in `server/routes/signal-groups.test.ts`
  - Test cases:
    1. Export a message with a signal group (repeatCount=4), import it back, verify repeatCount=4 in DB
    2. Export a message with a signal group (repeatCount=null), import it back, verify repeatCount=null
    3. Export a message with no signal groups, import it back, verify no groups created
  - This is a TDD test for Tasks 1-3 — run it AFTER Tasks 1-3 are complete to verify the fix works

  **Must NOT do**:
  - Do NOT test signal parsing logic (that's Flink's job)
  - Do NOT test the frontend export UI — test the data flow
  - Do NOT modify existing tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard test file following existing patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (can write test code in parallel with Tasks 1-3, but test RUNS after they're done)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Final verification
  - **Blocked By**: Tasks 1, 2, 3 (test will fail until they're implemented, but can be written)

  **References**:

  **Test References** (testing patterns to follow):
  - `server/routes/signal-groups.test.ts` — Existing test patterns for signal group CRUD. Follow the same setup (db creation, API calls, assertions).

  **API/Type References**:
  - `server/routes/messages.ts:87-174` — Import endpoint contract
  - `src/foundation/types.ts:39-52` — SignalGroup interface

  **WHY Each Reference Matters**:
  - `signal-groups.test.ts`: Shows how to set up test DB, make API requests, and assert results
  - `messages.ts:87-174`: The import endpoint being tested

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created with 3 test cases
  - [ ] `bun test` → PASS (all 3 tests, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Round-trip test passes for repeatCount=4
    Tool: Bash
    Preconditions: Tasks 1-3 completed, server has test infrastructure
    Steps:
      1. Run: bun test
      2. Verify the round-trip test case for repeatCount=4 passes
    Expected Result: Test passes, repeatCount preserved through export → import
    Failure Indicators: Test fails with repeatCount mismatch
    Evidence: .sisyphus/evidence/task-4-roundtrip-test.txt

  Scenario: Round-trip test passes for repeatCount=null
    Tool: Bash
    Preconditions: Tasks 1-3 completed
    Steps:
      1. Run: bun test
      2. Verify the round-trip test case for repeatCount=null passes
    Expected Result: null preserved through export → import
    Evidence: .sisyphus/evidence/task-4-roundtrip-null.txt
  ```

  **Commit**: YES (separate commit)
  - Message: `test(export): add round-trip test for repeatCount preservation`
  - Pre-commit: `bun test`

- [x] 5. Write Flink test spec with repeating signal group

  **What to do**:
  - Create a new test resource file `smart-charge-flink/src/test/resources/test-spec-repeating.json`
  - This spec should include:
    - A message with frameSize=8 (64 bits)
    - A repeating signal group: `{ name: "CellVoltage", startBit: 0, bitWidth: 32, isRepeating: true, repeatCount: 2 }`
    - Signals within the group: `{ name: "Voltage", startBit: 0, bitLength: 16, factor: 0.001, offset: 0, unit: "V", groupName: "CellVoltage" }` and `{ name: "Temp", startBit: 16, bitLength: 8, factor: 1.0, offset: -40, unit: "C", groupName: "CellVoltage" }`
    - The group occupies bits 0-31, repeatCount=2 means the pattern occupies bits 0-63
    - Also include one non-grouped signal for testing mixed scenarios
  - This spec will be used by Task 6 (failing tests) and Task 7 (implementation)

  **Must NOT do**:
  - Do NOT modify the existing `test-spec.json` — it's used by existing tests
  - Do NOT include overly complex scenarios — keep it simple for TDD

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Create a JSON file following existing pattern
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `smart-charge-flink/src/test/resources/test-spec.json` — Existing test spec. Follow same structure but add signalGroups with repeatCount.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/MessageSpec.java:45-65` — SignalGroupDef structure. Must include: name, description, startBit, bitWidth, isRepeating, repeatCount.

  **WHY Each Reference Matters**:
  - `test-spec.json`: Template for the new test spec file
  - `MessageSpec.java:45-65`: Defines the exact Java class that will deserialize the JSON — fields must match

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Test spec JSON is valid and parseable
    Tool: Bash (mvn test with a simple load test)
    Preconditions: File created
    Steps:
      1. Verify JSON is valid: cat smart-charge-flink/src/test/resources/test-spec-repeating.json | python3 -m json.tool > /dev/null
      2. Verify file exists and contains signalGroups with repeatCount=2
    Expected Result: Valid JSON with signalGroups array containing one group with repeatCount=2
    Failure Indicators: JSON parse error or missing repeatCount
    Evidence: .sisyphus/evidence/task-5-test-spec-valid.txt
  ```

  **Commit**: YES (groups with Tasks 6, 7)
  - Message: `feat(flink): expand repeating signal groups at parse time`

- [x] 6. Write failing Flink SignalParser tests for group expansion (TDD RED)

  **What to do**:
  - Open `smart-charge-flink/src/test/java/com/smartcharge/flink/parser/SignalParserTest.java`
  - Add new test methods using the `test-spec-repeating.json` from Task 5:
  
  **Test Case 1: Repeating group expands signal count**
  ```java
  @Test
  void expandsRepeatingGroupSignals() {
      // Group "CellVoltage" has 2 signals, repeatCount=2
      // Expected: Voltage_1, Temp_1, Voltage_2, Temp_2 + any non-grouped signals
      SignalParser repeatingParser = SignalParser.fromResource("test-spec-repeating.json");
      ParsedMessage result = repeatingParser.parse("0FA0412EE0B0FFFF");
      // Assert signal names include suffixed instances
      assertTrue(result.getSignals().containsKey("Voltage_1"));
      assertTrue(result.getSignals().containsKey("Voltage_2"));
      assertTrue(result.getSignals().containsKey("Temp_1"));
      assertTrue(result.getSignals().containsKey("Temp_2"));
  }
  ```
  
  **Test Case 2: Non-repeating signals unchanged**
  ```java
  @Test
  void nonGroupedSignalsUnchanged() {
      // Non-grouped signal should appear with original name (no suffix)
      SignalParser repeatingParser = SignalParser.fromResource("test-spec-repeating.json");
      ParsedMessage result = repeatingParser.parse("0FA0412EE0B0FFFF");
      assertTrue(result.getSignals().containsKey("Status")); // non-grouped signal, no suffix
  }
  ```
  
  **Test Case 3: Expanded signals have correct values**
  ```java
  @Test
  void expandedSignalsHaveCorrectValues() {
      // Voltage_1 should extract from bits 0-15 (first repetition)
      // Voltage_2 should extract from bits 32-47 (second repetition = startBit + bitWidth)
      SignalParser repeatingParser = SignalParser.fromResource("test-spec-repeating.json");
      ParsedMessage result = repeatingParser.parse("0FA0412EE0B0FFFF");
      // Verify the values are extracted from the correct bit positions
      // (exact values depend on the test hex string and spec)
  }
  ```
  
  **Test Case 4: RepeatCount 1 or null treated as non-repeating**
  ```java
  @Test
  void singleRepeatTreatedAsNonRepeating() {
      // Load original test-spec.json (signalGroups is empty)
      // All signals should have original names, no suffixes
      ParsedMessage result = parser.parse("0FA0412EE0B0FFFF");
      assertFalse(result.getSignals().containsKey("EngineRPM_1"));
      assertTrue(result.getSignals().containsKey("EngineRPM"));
  }
  ```
  
  **Test Case 5: Repeating group with correct bit offsets**
  ```java
  @Test
  void repeatingGroupUsesCorrectBitOffsets() {
      // Second repetition of group at startBit=0, bitWidth=32 → signals at startBit+32
      // Voltage (bitLength=16) in repetition 2 → extracted at startBit 0+32=32
      // Temp (bitLength=8) in repetition 2 → extracted at startBit 16+32=48
  }
  ```

  - These tests MUST FAIL initially (RED phase) because SignalParser doesn't expand groups yet
  - Create a `@BeforeAll` setup method for the repeating parser (separate from existing `parser`)

  **Must NOT do**:
  - Do NOT implement the parsing logic — only write tests
  - Do NOT modify existing test methods or the existing `parser` setup
  - Do NOT add tests for edge cases beyond the 5 listed (keep scope focused)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires understanding of Java JUnit patterns, bit-level CAN parsing, and the expansion logic design
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Task 7 (implementation)
  - **Blocked By**: Task 5 (test spec file must exist for tests to compile)

  **References**:

  **Test References**:
  - `smart-charge-flink/src/test/java/com/smartcharge/flink/parser/SignalParserTest.java` — Existing test class. Add new test methods here, follow the same patterns (@BeforeAll, assertions).
  - `smart-charge-flink/src/test/resources/test-spec-repeating.json` — New test spec from Task 5.

  **API/Type References**:
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/parser/SignalParser.java:57-71` — Current `parse()` method that needs expansion. Tests assert new behavior.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/MessageSpec.java:45-65` — SignalGroupDef with repeatCount field.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/SignalDef.java` — SignalDef with groupName field.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/ParsedMessage.java` — Output model with `getSignals()` map.

  **WHY Each Reference Matters**:
  - `SignalParserTest.java`: Where to add tests, existing patterns to follow
  - `test-spec-repeating.json`: Test data file the tests will load
  - `SignalParser.java:57-71`: The method under test — understanding current behavior is key to writing correct assertions
  - `MessageSpec.java:45-65`: The group definition that will be used in expansion
  - `ParsedMessage.java`: The output format — tests assert on `getSignals()` map keys and values

  **Acceptance Criteria**:

  **If TDD (RED phase):**
  - [ ] 5 new test methods added to SignalParserTest.java
  - [ ] `mvn test -Dtest=SignalParserTest` → 5 new tests FAIL, all existing tests PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: New tests compile and fail as expected (TDD RED)
    Tool: Bash (mvn test)
    Preconditions: Task 5 completed (test spec exists)
    Steps:
      1. cd smart-charge-flink && mvn test -Dtest=SignalParserTest 2>&1 | tee /tmp/flink-test-output.txt
      2. Verify: existing tests (parsesFullFrame, parsesZeroFrame, etc.) all PASS
      3. Verify: new tests (expandsRepeatingGroupSignals, etc.) FAIL with clear assertion errors
    Expected Result: ~12 tests pass (existing), ~5 tests fail (new). Build reports test failures.
    Failure Indicators: Compilation error, or new tests unexpectedly pass (tests may be wrong)
    Evidence: .sisyphus/evidence/task-6-tdd-red.txt
  ```

  **Commit**: NO (commits with Task 7)
  - Will be part of the feat(flink) commit after implementation

- [x] 7. Implement Flink SignalParser group expansion (TDD GREEN + REFACTOR)

  **What to do**:
  - Open `smart-charge-flink/src/main/java/com/smartcharge/flink/parser/SignalParser.java`
  - Modify the constructor and `parse()` method to expand repeating groups:

  **Constructor changes** (lines 29-33):
  - Store `signalGroups` from spec alongside existing `signals`
  - Build an expanded signal list that includes repeated instances
  
  **Expansion logic**:
  ```
  For each signal:
    If signal has a groupName:
      Find the group by name
      If group.repeatCount >= 2:
        For i = 1 to repeatCount:
          Create expanded signal: name = "{signal.name}_{i}", startBit = signal.startBit + (i-1) * group.bitWidth
          Add to expanded list
      Else (repeatCount <= 1 or null):
        Add signal as-is (no suffix)
    Else (no groupName):
      Add signal as-is (no suffix)
  ```
  
  **Key implementation details**:
  - The `SignalParser` constructor should build the expanded list once (not per-parse call)
  - Bit offset for repetition N: `signal.startBit + (N-1) * group.bitWidth`
  - First instance gets `_1` suffix (1-based indexing)
  - Non-grouped signals: no change, no suffix
  - Group with repeatCount <= 1: treated as non-repeating, no expansion

  **parse() method** (lines 57-71):
  - Should iterate the expanded signal list instead of the original
  - Rest of the logic (extractSignal, extractBits) stays unchanged

  **After implementation**: Run `mvn test` to verify all tests pass (TDD GREEN).

  **Must NOT do**:
  - Do NOT modify `extractSignal()` or `extractBits()` methods — they work correctly
  - Do NOT change the `ParsedMessage` output format
  - Do NOT add complex validation or error handling for invalid repeatCount
  - Do NOT over-abstract — keep the expansion logic inline and readable
  - Do NOT add logging

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding bit-level CAN parsing, group expansion math, and careful testing
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sole task)
  - **Blocks**: Final verification
  - **Blocked By**: Tasks 5 (test spec), 6 (failing tests)

  **References**:

  **Pattern References**:
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/parser/SignalParser.java:29-33` — Constructor. Add group expansion here to build expanded signal list once.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/parser/SignalParser.java:57-71` — parse() method. Change to use expanded signal list.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/parser/SignalParser.java:80-90` — extractSignal(). DO NOT MODIFY. Works correctly for individual signals.

  **API/Type References**:
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/MessageSpec.java:45-65` — SignalGroupDef with repeatCount, startBit, bitWidth. Used to calculate offsets.
  - `smart-charge-flink/src/main/java/com/smartcharge/flink/model/SignalDef.java` — SignalDef with groupName. Used to match signals to groups.

  **Test References**:
  - `smart-charge-flink/src/test/java/com/smartcharge/flink/parser/SignalParserTest.java` — The failing tests from Task 6. These define the expected behavior.

  **WHY Each Reference Matters**:
  - `SignalParser.java:29-33`: Where expansion logic goes — constructor builds the expanded list
  - `SignalParser.java:57-71`: Must use expanded list instead of raw spec.getSignals()
  - `MessageSpec.java:45-65`: Provides group.startBit, group.bitWidth, group.repeatCount for offset calculation
  - `SignalDef.java`: Provides signal.groupName to match signal to group
  - `SignalParserTest.java`: The tests that must pass after implementation

  **Acceptance Criteria**:

  **If TDD (GREEN phase):**
  - [ ] `mvn test -Dtest=SignalParserTest` → ALL tests pass (existing + new, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All Flink tests pass including group expansion (TDD GREEN)
    Tool: Bash (mvn test)
    Preconditions: Tasks 5, 6 completed; implementation done
    Steps:
      1. cd smart-charge-flink && mvn test 2>&1 | tee /tmp/flink-green.txt
      2. Verify: ALL tests pass (0 failures)
      3. Specifically check: expandsRepeatingGroupSignals, nonGroupedSignalsUnchanged, expandedSignalsHaveCorrectValues, singleRepeatTreatedAsNonRepeating, repeatingGroupUsesCorrectBitOffsets
    Expected Result: BUILD SUCCESS, all tests pass
    Failure Indicators: Any test failure, especially the new group expansion tests
    Evidence: .sisyphus/evidence/task-7-tdd-green.txt

  Scenario: Existing tests still pass (no regression)
    Tool: Bash (mvn test)
    Preconditions: Implementation complete
    Steps:
      1. cd smart-charge-flink && mvn test -Dtest=SignalParserTest 2>&1
      2. Verify: parsesFullFrame, parsesZeroFrame, handlesSignedNegativeValue, extractsSingleBit, extractsMultiBitWithinByte, rejectsWrongLength, rejectsInvalidHex, hexToBytesParsesCorrectly, hexToBytesCaseInsensitive, signExtendPositiveValue, signExtendNegativeValue, signExtend16BitNegative, parserMetadataCorrect, bcdTimeDecodes24Bit, bcdTimeDecodes32Bit, bcdTimeMidnight, bcdTimeWithOffset — all PASS
    Expected Result: All 17+ existing tests pass with no changes
    Failure Indicators: Any existing test fails (regression)
    Evidence: .sisyphus/evidence/task-7-no-regression.txt
  ```

  **Commit**: YES (with Tasks 5, 6)
  - Message: `feat(flink): expand repeating signal groups at parse time`
  - Files: `SignalParser.java`, `SignalParserTest.java`, `test-spec-repeating.json`
  - Pre-commit: `cd smart-charge-flink && mvn test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Output: `Must Have [5/5] | Must NOT Have [8/8] | Tasks [7/7] | VERDICT: REJECT` (2 Flink tests fail due to bit offset calculation bug)
  Notes: All Must Have implemented, no Must NOT Have violations. Flink implementation has 2 failing tests.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Output: `Build [FAIL] | Tests [Maven: 20 pass/2 fail | Bun: 76 pass/1 fail] | Files [4 clean/0 issues] | VERDICT: REJECT`
  Notes: Code quality CLEAN. Test failures are real bugs, not quality issues.

- [x] F3. **Real Manual QA** — `unspecified-high`
  Output: `Scenarios [5/5 pass] | Integration [PASS] | VERDICT: COMPLETE`
  Notes: Implementation correct per spec. 2 tests have INCORRECT EXPECTED VALUES (not implementation bugs).

- [x] F4. **Scope Fidelity Check** — `deep`
  Output: `Tasks [4/7 compliant] | Contamination [5 issues] | Unaccounted [CLEAN] | VERDICT: REJECT`
  Notes: version-panel.tsx (+206 lines history view), bit-canvas.tsx, signal-list.tsx, use-version-store.ts, show.tsx modified beyond repeatCount export scope.

---

## Commit Strategy

- **Commit 1** (after Tasks 1-3): `fix(export): add repeatCount to signalGroups in export format`
  - Files: `message-editor.tsx`, `version-panel.tsx`, `server/routes/messages.ts`
  - Pre-commit: `bun test`

- **Commit 2** (after Task 4): `test(export): add round-trip test for repeatCount preservation`
  - Files: test file
  - Pre-commit: `bun test`

- **Commit 3** (after Tasks 5-7): `feat(flink): expand repeating signal groups at parse time`
  - Files: `SignalParser.java`, `test-spec.json`, `SignalParserTest.java`
  - Pre-commit: `cd smart-charge-flink && mvn test`

---

## Success Criteria

### Verification Commands
```bash
# TypeScript tests pass
bun test  # Expected: all pass

# Flink tests pass
cd smart-charge-flink && mvn test  # Expected: all pass including new group expansion tests

# Export format check
# Manually trigger export and verify JSON contains repeatCount field
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All existing tests pass
- [ ] New Flink tests for repeating group expansion pass
- [ ] Export round-trip preserves repeatCount
