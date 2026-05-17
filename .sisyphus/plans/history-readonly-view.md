# History Read-Only View (历史记录只读查看)

## TL;DR

> **Quick Summary**: Add click-to-preview functionality to the version history panel. Clicking a version loads its snapshot into the canvas and signal list in read-only mode, with a banner indicator. Click the "latest" entry to return to live editing.
>
> **Deliverables**:
> - Version store extended with preview state and snapshot loading
> - BitCanvas supports read-only mode (no drag-select, no interaction)
> - SignalList shows historical signals with edit/delete buttons hidden
> - VersionPanel items are clickable and visually highlight the active preview
> - PreviewBanner shown above canvas during preview mode
> - show.tsx orchestrates preview/live mode switching
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (store) → Task 3/4/5 (components) → Task 6 (integration)

---

## Context

### Original Request
用户希望历史记录能够点击后中间画布能够查看到过去的定义，但是不能修改

### Interview Summary
**Key Discussions**:
- Sidebar (SignalList) + canvas (BitCanvas) both update when viewing historical version
- Exit preview by clicking the "latest" version entry in the list
- Prominent banner above canvas showing "Viewing historical version: [commit message]"
- Rollback button remains separate from preview functionality
- TDD approach for testing

**Research Findings**:
- `GET /api/versions/:id` already returns full `VersionSnapshot` - no server changes needed
- BitCanvas uses `useCanvasSelection` hook for drag-to-select - needs disabling in read-only mode
- No existing read-only patterns in the codebase
- VersionSnapshot shape matches what components consume: `{ message, signals, signalGroups, valueTables, messageTags, signalTags }`

### Metis Review
**Identified Gaps** (addressed):
- Unsaved changes: Not applicable - this app saves immediately on edit; versions are explicit commits
- Rollback in preview: Rollback button disabled with tooltip during preview
- Loading states: Added loading indicator while fetching snapshot
- Preview state persistence: Not persisted to URL - refresh exits preview (sensible default)
- Rapid clicking: Use last-wins strategy (newer click supersedes)
- Empty historical version: Shows empty canvas with banner (natural behavior)
- Banner accessibility: Added explicit "Exit Preview" button on banner for accessibility

---

## Work Objectives

### Core Objective
Enable users to view (not edit) historical versions of their signal definitions by clicking version entries in the VersionPanel.

### Concrete Deliverables
- Extended `useVersionStore` with preview state
- Read-only `BitCanvas` mode
- Read-only `SignalList` mode
- Clickable `VersionPanel` items with visual highlighting
- `PreviewBanner` component
- Integrated preview/live mode switching in `show.tsx`

### Definition of Done
- [ ] Clicking a non-latest version in VersionPanel loads its snapshot into canvas + sidebar
- [ ] Canvas and sidebar are fully read-only during preview (no edits possible)
- [ ] Banner displays above canvas during preview with version info + "Exit Preview" button
- [ ] Clicking the latest version entry returns to live editing mode
- [ ] All TDD tests pass (`bun test`)

### Must Have
- Read-only canvas: no drag-select, no signal creation, no bit interaction
- Read-only sidebar: edit/delete buttons hidden or disabled
- Visual banner indicator during preview
- VersionPanel highlights currently previewed version
- Loading state while fetching snapshot
- Rollback button disabled during preview mode
- Escape key exits preview mode

### Must NOT Have (Guardrails)
- NO diff visualization between versions
- NO side-by-side comparison of two versions
- NO editing of historical data
- NO changes to the version commit/rollback flow
- NO URL persistence of preview state
- NO export during preview mode
- NO annotations or notes on preview
- NO mobile layout changes

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (`bun:test`)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: `bun:test`
- **Each task**: Write failing test first, then implement to pass

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **Components**: Use interactive_bash (tmux) - Run dev server, interact via browser

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - store logic + banner UI):
├── Task 1: Version store preview state (TDD) [deep]
└── Task 2: PreviewBanner component [quick]

Wave 2 (Components - max parallel, depends on Task 1):
├── Task 3: BitCanvas read-only mode (TDD) [deep]
├── Task 4: SignalList read-only mode (TDD) [deep]
└── Task 5: VersionPanel click handler + highlighting (TDD) [unspecified-high]

Wave 3 (Integration - depends on Tasks 2-5):
└── Task 6: Wire show.tsx + integration + QA [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 3/4/5 → Task 6 → F1-F4
Parallel Speedup: ~45% faster than sequential
Max Concurrent: 3 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 3, 4, 5 | 1 |
| 2 | - | 6 | 1 |
| 3 | 1 | 6 | 2 |
| 4 | 1 | 6 | 2 |
| 5 | 1 | 6 | 2 |
| 6 | 2, 3, 4, 5 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `deep`, T2 → `quick`
- **Wave 2**: 3 tasks — T3 → `deep`, T4 → `deep`, T5 → `unspecified-high`
- **Wave 3**: 1 task — T6 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Version Store Preview State (TDD)

  **What to do**:
  - Write failing test for `useVersionStore` preview state management
  - Add `previewSnapshot: VersionSnapshot | null` state field
  - Add `previewVersionId: string | null` state field
  - Add `isLoadingSnapshot: boolean` state field
  - Add `loadVersionSnapshot(id: string)` action: fetches `GET /api/versions/:id`, sets `previewSnapshot` and `previewVersionId`
  - Add `clearPreview()` action: sets `previewSnapshot` and `previewVersionId` to null
  - Add derived getter `isPreviewMode: boolean` (true when `previewSnapshot` is not null)
  - Make tests pass

  **Must NOT do**:
  - Do NOT modify `useMessageStore` (preview data lives in version store)
  - Do NOT add URL routing logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: TDD with state management logic requires careful test design
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Required for TDD RED-GREEN-REFACTOR cycle
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: Requirements already clear from interview

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `src/domains/version/hooks/use-version-store.ts` — Current version store structure. Follow the exact same `create<Store>` pattern with `set` and `get`
  - `src/domains/message/hooks/use-message-store.ts` — Pattern for state fields + async actions (fetch + set pattern at lines 48-71)

  **API/Type References** (contracts to implement against):
  - `src/foundation/types.ts:VersionSnapshot` (lines 82-89) — The snapshot shape returned by `GET /api/versions/:id`
  - `src/foundation/types.ts:Version` (lines 72-80) — Full version type with snapshot field
  - `server/routes/versions.ts:85-95` — `GET /api/versions/:id` endpoint, returns `{ ...row, snapshot: JSON.parse(row.snapshot), diff }`

  **Test References** (testing patterns to follow):
  - `src/foundation/lib/constants.test.ts` — `bun:test` import pattern: `import { describe, it, expect } from 'bun:test'`

  **WHY Each Reference Matters**:
  - `use-version-store.ts`: You're EXTENDING this file. Match the existing Zustand create pattern exactly.
  - `use-message-store.ts`: Shows how async fetch→set pattern works in this codebase. Copy the error handling approach.
  - `VersionSnapshot` type: This is the exact shape the API returns — your `previewSnapshot` must be typed as this.
  - `server/routes/versions.ts` lines 85-95: Confirms the API response shape — `snapshot` is already parsed JSON, not a string.

  **Acceptance Criteria**:

  **If TDD (tests enabled)**:
  - [ ] Test file created: `src/domains/version/hooks/use-version-store.test.ts`
  - [ ] `bun test src/domains/version/hooks/use-version-store.test.ts` → PASS
  - [ ] Tests cover: loadVersionSnapshot sets state, clearPreview resets state, isPreviewMode derived, isLoadingSnapshot during fetch, API error handling

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Load version snapshot via store action
    Tool: Bash (bun test)
    Preconditions: Dev server not needed - unit test only
    Steps:
      1. Run `bun test src/domains/version/hooks/use-version-store.test.ts`
      2. Assert all tests pass with 0 failures
    Expected Result: All tests pass. Test output shows: loadVersionSnapshot, clearPreview, isPreviewMode tests all green.
    Failure Indicators: Any test failure, import errors, type errors
    Evidence: .sisyphus/evidence/task-1-store-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(version): add preview state to version store`
  - Files: `src/domains/version/hooks/use-version-store.ts`, `src/domains/version/hooks/use-version-store.test.ts`
  - Pre-commit: `bun test src/domains/version/hooks/use-version-store.test.ts`

- [x] 2. PreviewBanner Component

  **What to do**:
  - Create `src/domains/version/components/preview-banner.tsx`
  - Props: `commitMessage: string`, `onExit: () => void`
  - Render a colored banner (amber/yellow background) above the canvas area
  - Show text: "正在查看历史版本: {commitMessage}"
  - Include an "退出预览" (Exit Preview) button
  - Include an "×" close button
  - Style: prominent but not overwhelming, `bg-amber-50 border-amber-200 border-b`

  **Must NOT do**:
  - Do NOT add state management logic (pure presentational)
  - Do NOT add animation/transitions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple presentational component with no logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `test-driven-development`: No logic to test per project testing guide ("skip purely layout components")

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `src/domains/version/components/version-panel.tsx` — Adjacent component, follow same styling conventions (Tailwind classes, text sizes)
  - `src/pages/message/show.tsx:71-127` — Layout structure where banner will be inserted

  **API/Type References**:
  - `src/foundation/types.ts:VersionSummary.message` — The commit message string to display

  **WHY Each Reference Matters**:
  - `version-panel.tsx`: Same domain, same styling conventions. Match the text-xs/text-sm pattern.
  - `show.tsx`: You need to understand WHERE the banner will be placed (above the `<main>` canvas area).

  **Acceptance Criteria**:

  - [ ] File created: `src/domains/version/components/preview-banner.tsx`
  - [ ] Component renders with commit message and exit button
  - [ ] No TypeScript errors (`bun run typecheck`)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Banner renders correctly with commit message
    Tool: Bash (bunx tsc --noEmit)
    Preconditions: File exists
    Steps:
      1. Run `bun run typecheck`
      2. Verify no errors related to preview-banner.tsx
    Expected Result: TypeScript compilation succeeds with no errors for the new file
    Failure Indicators: Type errors, missing imports
    Evidence: .sisyphus/evidence/task-2-banner-typecheck.txt

  Scenario: Banner component exports correctly
    Tool: Bash (node -e)
    Preconditions: File exists
    Steps:
      1. Run `node -e "const fs = require('fs'); const c = fs.readFileSync('src/domains/version/components/preview-banner.tsx', 'utf8'); console.assert(c.includes('export function PreviewBanner'), 'Missing export'); console.assert(c.includes('onExit'), 'Missing onExit prop'); console.log('OK')"`
    Expected Result: "OK" printed, component has correct export and props
    Failure Indicators: Missing export, missing props
    Evidence: .sisyphus/evidence/task-2-banner-structure.txt
  ```

  **Commit**: YES
  - Message: `feat(version): add PreviewBanner component`
  - Files: `src/domains/version/components/preview-banner.tsx`

- [x] 3. BitCanvas Read-Only Mode (TDD)
- [x] 4. SignalList Read-Only Mode (TDD)
- [x] 5. VersionPanel Click Handler + Highlighting (TDD)

  **What to do**:
  - Write failing test for VersionPanel click-to-preview behavior
  - Make each version item clickable (except the currently previewed one)
  - On click: call `useVersionStore.loadVersionSnapshot(version.id)` to enter preview
  - On click the "latest" version (index 0): call `useVersionStore.clearPreview()` to exit preview
  - Visual highlighting: the currently previewed version gets `bg-blue-50 border-l-2 border-blue-500` style
  - Disable the "Rollback" button during preview mode (add `disabled` + tooltip "退出预览后才能回滚")
  - Add a small "查看" (View) icon/text hint on non-latest versions to indicate clickability

  **Must NOT do**:
  - Do NOT change the rollback functionality itself
  - Do NOT change the commit input/save button area
  - Do NOT auto-scroll to the previewed version

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: TDD with component interaction + visual state, moderate complexity
  - **Skills**: [`test-driven-development`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/domains/version/components/version-panel.tsx` — THE file to modify. Version items at lines 56-84, rollback button at lines 73-79
  - `src/domains/version/hooks/use-version-store.ts` — Store to consume for `loadVersionSnapshot`, `clearPreview`, `isPreviewMode`, `previewVersionId`

  **API/Type References**:
  - `src/foundation/types.ts:VersionSummary` — The type of each item in the versions list

  **WHY Each Reference Matters**:
  - `version-panel.tsx`: You're MODIFYING this file. The version item div at lines 56-84 needs an onClick handler. The rollback button at lines 73-79 needs to be disabled when in preview. The `latest` badge at lines 65-67 shows how conditional styling works here.

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Test file created: `src/domains/version/components/version-panel.test.tsx`
  - [ ] `bun test src/domains/version/components/version-panel.test.tsx` → PASS
  - [ ] Tests cover: click version triggers loadVersionSnapshot, click latest triggers clearPreview, rollback disabled during preview, highlighting applied to previewed version

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: VersionPanel click handler loads snapshot
    Tool: Bash (bun test)
    Steps:
      1. Run `bun test src/domains/version/components/version-panel.test.tsx`
      2. Verify all tests pass
    Expected Result: Tests confirm click behavior works correctly
    Evidence: .sisyphus/evidence/task-5-version-panel-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(version): add click-to-preview in VersionPanel`
  - Files: `src/domains/version/components/version-panel.tsx`, `src/domains/version/components/version-panel.test.tsx`

- [x] 6. Wire show.tsx + Integration + Escape Key (TDD)

  **What to do**:
  - Modify `src/pages/message/show.tsx` to integrate all preview components
  - Read `isPreviewMode`, `previewSnapshot`, `isLoadingSnapshot` from `useVersionStore`
  - Compute the data to pass to BitCanvas and SignalList:
    - If `isPreviewMode`: use `previewSnapshot.signals`, `previewSnapshot.signalGroups`, `previewSnapshot.message`
    - If NOT preview: use existing `activeSignals`, `activeGroups`, `activeMessage` from `useMessageStore`
  - Pass `readOnly={isPreviewMode}` to both `BitCanvas` and `SignalList`
  - Render `PreviewBanner` above the canvas `<main>` when `isPreviewMode` is true
  - Pass `onExit={() => useVersionStore.getState().clearPreview()}` to PreviewBanner
  - Add `useEffect` for Escape key listener: when `isPreviewMode`, pressing Escape calls `clearPreview()`
  - Show a loading spinner overlay on the canvas area when `isLoadingSnapshot` is true
  - When in preview mode, hide the header message editor fields (name input, frame size input, tag input, export, delete buttons) or disable them — the header bar should show the historical message name as read-only text
  - When a new message is selected (activeMessageId changes), auto-clear preview mode

  **Must NOT do**:
  - Do NOT modify any API endpoints
  - Do NOT add new Zustand stores (use existing version store)
  - Do NOT add URL routing for preview state
  - Do NOT add animations or transitions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration task wiring multiple components together, needs careful data flow
  - **Skills**: [`test-driven-development`, `playwright`]
    - `test-driven-development`: For integration test
    - `playwright`: For end-to-end QA scenario verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 3, 4, 5

  **References**:

  **Pattern References**:
  - `src/pages/message/show.tsx` — THE file to modify. Full 3-column layout at lines 71-143. Canvas at lines 114-123. Sidebar at lines 73-112. Version panel at lines 125-127.
  - `src/pages/message/show.tsx:39-51` — `handleBitSelection` function showing how canvas events are wired

  **API/Type References**:
  - `src/domains/version/hooks/use-version-store.ts` — Extended store from Task 1 with `previewSnapshot`, `isPreviewMode`, `loadVersionSnapshot`, `clearPreview`
  - `src/domains/version/components/preview-banner.tsx` — Banner component from Task 2
  - `src/foundation/types.ts:VersionSnapshot` — Shape of snapshot data to pass to components

  **Test References**:
  - `contributing/unit-test.md` — Testing patterns for this project

  **WHY Each Reference Matters**:
  - `show.tsx`: This is the integration point. You need to understand the complete 3-column layout to know WHERE to insert the banner (between the header concept and the canvas), how to conditionally pass data to BitCanvas and SignalList, and how to wire the Escape key listener.
  - `VersionSnapshot` type: The snapshot has `.signals`, `.signalGroups`, `.message` — these are the same shapes as what BitCanvas and SignalList expect, so you can pass them directly.

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] `bun test` → ALL tests pass (existing + new)
  - [ ] `bun run typecheck` → no errors

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: End-to-end preview flow - click version, view snapshot, exit
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running (`bun run dev`), at least one message with 2+ versions exists
    Steps:
      1. Navigate to `http://localhost:5173/{messageId}`
      2. Wait for page to load - verify canvas shows signals
      3. Click on a non-latest version entry in the right sidebar VersionPanel
      4. Wait 1 second for snapshot to load
      5. Assert: PreviewBanner is visible with text containing "正在查看历史版本"
      6. Assert: Canvas shows the historical version's signals (may differ from current)
      7. Assert: SignalList sidebar shows historical signals without edit/delete buttons
      8. Assert: No drag selection works on canvas (try to drag - should not select)
      9. Click the "退出预览" button on the banner
      10. Assert: Banner disappears
      11. Assert: Canvas returns to current live signals
      12. Assert: Edit/delete buttons reappear in sidebar
    Expected Result: Full preview enter/view/exit cycle works correctly
    Failure Indicators: Banner not visible, canvas not updating, buttons not hiding
    Evidence: .sisyphus/evidence/task-6-e2e-preview-flow.png

  Scenario: Click latest version to exit preview
    Tool: Playwright (playwright skill)
    Preconditions: In preview mode (from previous scenario)
    Steps:
      1. Click a non-latest version to enter preview
      2. Verify banner appears
      3. Click the "latest" version entry (first item, with "latest" badge)
      4. Assert: Banner disappears
      5. Assert: Canvas returns to live editing mode
    Expected Result: Clicking latest exits preview correctly
    Evidence: .sisyphus/evidence/task-6-exit-via-latest.png

  Scenario: Escape key exits preview
    Tool: Playwright (playwright skill)
    Preconditions: In preview mode
    Steps:
      1. Click a non-latest version to enter preview
      2. Verify banner appears
      3. Press Escape key
      4. Assert: Banner disappears, canvas returns to live mode
    Expected Result: Escape key exits preview
    Evidence: .sisyphus/evidence/task-6-escape-exit.png

  Scenario: Rollback disabled during preview
    Tool: Playwright (playwright skill)
    Preconditions: In preview mode
    Steps:
      1. Click a non-latest version to enter preview
      2. Look for rollback buttons on version items
      3. Assert: Rollback buttons are disabled or not visible
    Expected Result: Rollback buttons disabled during preview
    Evidence: .sisyphus/evidence/task-6-rollback-disabled.png

  Scenario: Loading indicator while fetching snapshot
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to message page
      2. Click a version entry
      3. Assert: Brief loading indicator appears (even if fast)
    Expected Result: Loading state visible (even briefly)
    Evidence: .sisyphus/evidence/task-6-loading-state.png
  ```

  **Commit**: YES
  - Message: `feat(version): integrate history preview mode in show page`
  - Files: `src/pages/message/show.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Output: `Must Have [7/7] | Must NOT Have [8/8] | Tasks [6/6] | VERDICT: APPROVE`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Output: `Scenarios [5/5 pass] | Integration [5/5] | Edge Cases [2 tested] | VERDICT: APPROVE`

- [x] F4. **Scope Fidelity Check** — `deep`
  Output: `Tasks [6/6 compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT: APPROVE`

---

## Commit Strategy

- **Task 1**: `feat(version): add preview state to version store` - use-version-store.ts, use-version-store.test.ts
- **Task 2**: `feat(version): add PreviewBanner component` - preview-banner.tsx
- **Task 3**: `feat(canvas): add read-only mode to BitCanvas` - bit-canvas.tsx, bit-canvas.test.tsx
- **Task 4**: `feat(signals): add read-only mode to SignalList` - signal-list.tsx, signal-list.test.tsx
- **Task 5**: `feat(version): add click-to-preview in VersionPanel` - version-panel.tsx, version-panel.test.tsx
- **Task 6**: `feat(version): integrate history preview mode in show page` - show.tsx

---

## Success Criteria

### Verification Commands
```bash
bun test                                    # All tests pass (existing + new)
bun run typecheck                           # No TypeScript errors
bun run dev                                 # Dev server starts
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Click version → canvas + sidebar show snapshot
- [ ] Canvas is fully read-only in preview
- [ ] Sidebar edit/delete buttons hidden in preview
- [ ] Banner displays during preview
- [ ] Click latest or Escape → exit preview
- [ ] Rollback button disabled during preview
