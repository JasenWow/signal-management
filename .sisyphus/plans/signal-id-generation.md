# Signal ID 自动生成（确定性 Hash）

## TL;DR

> **Quick Summary**: 将 Signal ID 从 `randomUUID()` 替换为基于 `messageId + name + startBit + bitLength` 的 SHA-256 确定性哈希（截断 16 hex 字符），并在创建/导入时增加重复检测（409 Conflict）。
> 
> **Deliverables**:
> - `shared/signal-id.ts` — 共享 ID 生成工具函数 + 单元测试
> - 更新 `server/routes/signals.ts` — 创建时使用确定性 ID + 重复检测
> - 更新 `server/routes/messages.ts` — 导入时使用确定性 ID + 重复检测
> - 集成测试覆盖重复检测和边界情况
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2/3 (parallel) → Task 4 → Final

---

## Context

### Original Request
用户希望根据 message id、signal_name、startBit、bitLength 等信息自动生成 signal ID，而非使用随机 UUID。

### Interview Summary
**Key Discussions**:
- ID 格式：SHA-256 hash，截断为 16 hex 字符（如 `3a7f1b2c9d4e5f6a`）
- 数据迁移：不需要，全新数据库
- 冲突策略：跳过/报错（返回 409 Conflict）
- 测试：添加 vitest 单元测试

**Research Findings**:
- 项目使用 Node.js `crypto` 模块（已导入 `randomUUID`）
- SQLite TEXT PRIMARY KEY，better-sqlite3 驱动
- Hono 框架处理 API 路由
- 信号标签（`signal_tags`）使用 `signal_id` 作为外键，ID 稳定性很重要

### Metis Review
**Identified Gaps** (addressed):
- Name 大小写敏感性 → 保持大小写敏感（汽车行业标准）
- 信号更新时 ID 是否变化 → ID 在创建后不可变（主键语义）
- 分隔符安全性 → 使用 JSON 序列化替代 `::` 分隔符，消除碰撞风险
- 重复检测 HTTP 状态码 → 409 Conflict
- 输入验证 → 添加 startBit >= 0、bitLength > 0 的基本验证
- 导入路由批量冲突 → 整批失败并返回明确错误信息

---

## Work Objectives

### Core Objective
将 Signal ID 生成方式从随机 UUID 替换为确定性 SHA-256 哈希，使相同定义的信号始终产生相同 ID，并增加重复检测机制。

### Concrete Deliverables
- `shared/signal-id.ts` — `generateSignalId()` 纯函数
- `tests/signal-id.test.ts` — 工具函数单元测试
- 更新 `server/routes/signals.ts` — 确定性 ID + 409 冲突检测
- 更新 `server/routes/messages.ts` — 导入路由确定性 ID + 冲突检测
- `tests/signal-duplicate.test.ts` — 集成测试

### Definition of Done
- [x] `generateSignalId("msg-1", "foo", 0, 8)` 始终返回相同的 16 hex 字符串
- [x] 相同参数创建 signal 第二次返回 409 Conflict
- [x] 所有现有测试 `vitest run` 通过
- [x] 新增测试全部通过

### Must Have
- SHA-256 哈希截断 16 hex 字符
- 基于 `messageId + name + startBit + bitLength` 四个字段
- 创建和导入路径均使用确定性 ID
- 重复创建返回 409 Conflict 含明确错误信息
- 基本输入验证（startBit >= 0, bitLength > 0）
- 单元测试覆盖工具函数

### Must NOT Have (Guardrails)
- 不得修改已有 signal ID（不可变主键）
- 不得为 name 添加 slugify/normalize 逻辑（确定性 = 原样输入）
- 不得将此逻辑扩展到 Message ID 生成
- 不得添加迁移工具
- 不得修改 API 响应格式（id 字段仍为 string）
- 不得在冲突时静默重试或修改输入

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (TDD)
- **Framework**: vitest
- **If TDD**: 工具函数先写测试再实现；路由修改后补充集成测试

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (vitest) — Run tests, check pass/fail

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 立即开始):
└── Task 1: 创建 shared/signal-id.ts 工具函数 + 单元测试 [quick]

Wave 2 (路由更新 - Wave 1 完成后并行):
├── Task 2: 更新 signal 创建路由 (signals.ts) [quick]
└── Task 3: 更新 import 路由 (messages.ts) [quick]

Wave 3 (集成验证 - Wave 2 完成后):
└── Task 4: 集成测试 + 全量回归 [quick]

Wave FINAL (ALL tasks — 4 parallel reviews, then user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 4 → F1-F4 → user okay
Parallel Speedup: Task 2 & 3 parallel
Max Concurrent: 4 (FINAL wave)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1    | -         | 2, 3   | 1    |
| 2    | 1         | 4      | 2    |
| 3    | 1         | 4      | 2    |
| 4    | 2, 3      | FINAL  | 3    |
| F1-F4 | 4        | -      | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 2 tasks — T2 → `quick`, T3 → `quick`
- **Wave 3**: 1 task — T4 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 创建 `shared/signal-id.ts` 工具函数 + 单元测试

  **What to do**:
  - 创建 `shared/signal-id.ts`，导出 `generateSignalId(messageId: string, name: string, startBit: number, bitLength: number): string`
  - 使用 `crypto.createHash('sha256')` 对 JSON 序列化的 `[messageId, name, startBit, bitLength]` 进行哈希
  - 截取 hex digest 前 16 个字符作为返回值
  - 添加输入验证：`messageId` 和 `name` 非空字符串，`startBit >= 0`，`bitLength > 0`；不合法时抛出 Error
  - 创建 `tests/signal-id.test.ts`，覆盖以下测试用例：
    - 相同输入 → 相同输出（确定性）
    - 不同输入 → 不同输出（唯一性）
    - 输出格式为 16 字符 hex string（正则 `/^[0-9a-f]{16}$/`）
    - 空 messageId → 抛错
    - 空 name → 抛错
    - startBit < 0 → 抛错
    - bitLength <= 0 → 抛错
    - Unicode name（如 `"信号"`）→ 正常生成
    - 典型 CAN 信号场景（如 messageId UUID, name "EngineSpeed", startBit 0, bitLength 8）

  **Must NOT do**:
  - 不得添加 name normalize/slugify 逻辑
  - 不得使用 `::` 分隔符拼接（使用 JSON.stringify 防止碰撞）
  - 不得添加异步逻辑（保持同步函数）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单一工具函数 + 单元测试，逻辑清晰，不涉及复杂架构
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 无 UI 交互

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `server/routes/signals.ts:1-4` — 当前使用 `import { randomUUID } from 'crypto'`，新函数同样从 `crypto` 导入 `createHash`
  - `shared/constants.ts` — 共享常量的组织方式，`signal-id.ts` 应遵循相同的导出模式
  - `shared/types.ts:96-110` — `CreateSignalInput` 接口定义了 name, startBit, bitLength 的类型约束

  **Test References** (testing patterns to follow):
  - `tests/datatype.test.ts` — 查看 vitest 测试结构和断言风格
  - `tests/tags.test.ts` — 查看测试组织方式

  **External References**:
  - Node.js crypto: `crypto.createHash('sha256').update(input).digest('hex')` — 标准 SHA-256 用法

  **WHY Each Reference Matters**:
  - `signals.ts` 的 import 行告诉我们 crypto 模块已在项目中使用，无需新增依赖
  - `shared/constants.ts` 的导出模式确保新文件与现有代码风格一致
  - 现有测试文件展示了项目的测试风格（describe/it/expect），新测试应保持一致

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `tests/signal-id.test.ts`
  - [ ] `npx vitest run tests/signal-id.test.ts` → PASS (9+ tests, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 确定性验证 - 相同输入产生相同 ID
    Tool: Bash
    Preconditions: shared/signal-id.ts 和 tests/signal-id.test.ts 已创建
    Steps:
      1. 运行 `npx vitest run tests/signal-id.test.ts`
      2. 检查 "deterministic" 相关测试是否通过
    Expected Result: 测试 "generates same ID for same inputs" PASS
    Failure Indicators: 测试 FAIL 或未找到对应测试名
    Evidence: .sisyphus/evidence/task-1-deterministic.txt

  Scenario: 输入验证 - 非法输入抛错
    Tool: Bash
    Preconditions: 同上
    Steps:
      1. 运行 `npx vitest run tests/signal-id.test.ts`
      2. 检查所有 validation 相关测试通过
    Expected Result: 空 messageId、空 name、startBit < 0、bitLength <= 0 均抛出 Error
    Failure Indicators: 任何 validation 测试 FAIL
    Evidence: .sisyphus/evidence/task-1-validation.txt

  Scenario: 格式验证 - 输出为 16 hex 字符
    Tool: Bash
    Preconditions: 同上
    Steps:
      1. `node -e "import('./shared/signal-id.ts').then(m => console.log(m.generateSignalId('test-msg', 'TestSignal', 0, 8)))"` (或通过 vitest 测试验证)
      2. 检查输出匹配 `/^[0-9a-f]{16}$/`
    Expected Result: 输出为恰好 16 个小写 hex 字符
    Failure Indicators: 长度不为 16，或包含非 hex 字符
    Evidence: .sisyphus/evidence/task-1-format.txt
  ```

  **Commit**: YES
  - Message: `feat(signal-id): add deterministic signal ID generation utility`
  - Files: `shared/signal-id.ts`, `tests/signal-id.test.ts`
  - Pre-commit: `npx vitest run tests/signal-id.test.ts`

- [x] 2. 更新 signal 创建路由 (`server/routes/signals.ts`)

  **What to do**:
  - 将 `import { randomUUID } from 'crypto'` 替换为 `import { generateSignalId } from '../../shared/signal-id.js'`
  - 在 `POST /messages/:messageId/signals` handler 中：
    - 将 `const id = randomUUID()` 替换为 `const id = generateSignalId(messageId, body.name, body.startBit, body.bitLength)`
    - 用 try-catch 包裹 INSERT 语句
    - 捕获 SQLite UNIQUE constraint error（SQLITE_CONSTRAINT_PRIMARYKEY），返回 409 Conflict `{ error: 'Signal already exists with the same name, startBit and bitLength in this message' }`
    - 捕获来自 `generateSignalId` 的输入验证错误，返回 400 Bad Request `{ error: '...' }`
  - 确保 `PUT /signals/:id` 不受影响（更新不改变 ID）
  - 确保 `POST /signals/:id/validate` 不受影响

  **Must NOT do**:
  - 不得修改 PUT handler（更新时 ID 保持不变）
  - 不得修改 validate endpoint
  - 不得修改 DELETE handler

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 修改单一文件中的单个 handler，改动明确
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 无 UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `server/routes/signals.ts:22-45` — 当前 POST handler，需修改第 25 行的 `randomUUID()` 和增加 try-catch
  - `server/routes/signals.ts:8-17` — `mapSignal` 函数，不需要修改
  - `server/routes/messages.ts:72-84` — Message 创建路由作为参考（也用 randomUUID，但不需修改）

  **API/Type References**:
  - `shared/types.ts:96-110` — `CreateSignalInput` 接口定义了请求 body 的类型
  - `shared/types.ts:128-131` — `OverlapCheckResult` 类型

  **WHY Each Reference Matters**:
  - `signals.ts:22-45` 是需要修改的核心代码，executor 必须理解当前的创建流程
  - `CreateSignalInput` 确认了 `name`, `startBit`, `bitLength` 都是必填字段（不是 optional）
  - better-sqlite3 在 PRIMARY KEY 冲突时抛出 error，error.message 包含 `SQLITE_CONSTRAINT_PRIMARYKEY` 或 `UNIQUE constraint`

  **Acceptance Criteria**:

  - [ ] `npx vitest run` → ALL pass（含已有测试）
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] 创建 signal 不再使用 randomUUID

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 正常创建 signal 使用确定性 ID
    Tool: Bash (curl)
    Preconditions: 服务器运行中 (npm run dev:server)，存在 message id="test-msg-1"
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/test-msg-1/signals -H 'Content-Type: application/json' -d '{"name":"EngineSpeed","startBit":0,"bitLength":8}'
      2. 检查响应 status 201
      3. 检查响应 body 中 id 为 16 字符 hex string
    Expected Result: status 201, body.id 匹配 /^[0-9a-f]{16}$/
    Failure Indicators: status 非 201，或 id 不是 16 hex 字符
    Evidence: .sisyphus/evidence/task-2-create-success.txt

  Scenario: 重复创建返回 409 Conflict
    Tool: Bash (curl)
    Preconditions: 同上 signal 已创建成功
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/test-msg-1/signals -H 'Content-Type: application/json' -d '{"name":"EngineSpeed","startBit":0,"bitLength":8}'
      2. 检查响应 status 409
      3. 检查响应 body 包含 error 字段
    Expected Result: status 409, body 包含 { "error": "..." } 含 duplicate 相关描述
    Failure Indicators: status 201（创建了重复）或 500（未正确处理约束错误）
    Evidence: .sisyphus/evidence/task-2-duplicate-409.txt

  Scenario: 非法输入返回 400 Bad Request
    Tool: Bash (curl)
    Preconditions: 服务器运行中
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/test-msg-1/signals -H 'Content-Type: application/json' -d '{"name":"","startBit":0,"bitLength":8}'
      2. 检查响应 status 400
    Expected Result: status 400, body 包含验证错误信息
    Failure Indicators: status 201 或 500
    Evidence: .sisyphus/evidence/task-2-validation-400.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(signals): use deterministic signal ID with duplicate detection`
  - Files: `server/routes/signals.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 3. 更新 import 路由 (`server/routes/messages.ts`)

  **What to do**:
  - 在 `server/routes/messages.ts` 中导入 `generateSignalId`
  - 在 `POST /import` handler 中（第 113-150 行）：
    - 将第 140 行的 `randomUUID()` 替换为 `generateSignalId(messageId, s.name, s.startBit, s.bitLength)`
    - 用 try-catch 包裹 signal 插入循环
    - 检测重复时（SQLITE_CONSTRAINT_PRIMARYKEY），回滚已插入的 signals，返回 409 Conflict `{ error: 'Signal "SignalName" already exists in this message', conflictingSignals: [...] }`
    - 检测 `generateSignalId` 验证错误时，回滚已插入数据，返回 400 Bad Request
  - 注意：import 路由先创建 message 再创建 signals，需要在 transaction 中包裹 signal 批量插入部分
  - 确保 `POST /` (创建 message) 仍使用 randomUUID — message ID 不受影响

  **Must NOT do**:
  - 不得修改 `POST /` (message 创建) 的 ID 生成
  - 不得修改 GET / PUT / DELETE handlers
  - 不得移除 message 的 randomUUID import（message 创建仍在使用）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 修改单一文件的单个 handler，改动明确
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 无 UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `server/routes/messages.ts:113-150` — 当前 import handler，需修改第 140 行
  - `server/routes/messages.ts:131-135` — signalInsert prepared statement
  - `server/routes/signals.ts:22-45` — 参考已修改的 signal 创建路由（Task 2 的结果）

  **API/Type References**:
  - `shared/types.ts:96-110` — `CreateSignalInput` 接口

  **WHY Each Reference Matters**:
  - `messages.ts:113-150` 是 import handler 的完整代码，executor 需要理解 message + signals 的创建流程
  - `signals.ts` Task 2 的修改结果提供了相同的错误处理模式，保持一致性
  - better-sqlite3 支持 `db.transaction()` 方法包裹批量操作

  **Acceptance Criteria**:

  - [ ] `npx vitest run` → ALL pass
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] import 路由不再对 signal 使用 randomUUID

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 正常导入 message + signals 使用确定性 ID
    Tool: Bash (curl)
    Preconditions: 服务器运行中
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/import -H 'Content-Type: application/json' -d '{"message":{"name":"TestFrame","frameSize":8},"signals":[{"name":"Sig1","startBit":0,"bitLength":8},{"name":"Sig2","startBit":8,"bitLength":16}]}'
      2. 检查响应 status 201
      3. 检查每个 signal 的 id 为 16 hex 字符
    Expected Result: status 201, signals[].id 均匹配 /^[0-9a-f]{16}$/
    Failure Indicators: status 非 201，或 signal id 不是 16 hex
    Evidence: .sisyphus/evidence/task-3-import-success.txt

  Scenario: 导入冲突 signal 返回 409
    Tool: Bash (curl)
    Preconditions: 同名 signal 已存在于目标 message 中
    Steps:
      1. 先创建一个 message + signal
      2. 再次导入包含相同 name + startBit + bitLength 的 signal
      3. 检查响应 status 409
    Expected Result: status 409, body 包含冲突 signal 信息
    Failure Indicators: status 201（重复创建成功）或 500
    Evidence: .sisyphus/evidence/task-3-import-conflict.txt

  Scenario: 导入含非法 signal 数据时返回 400
    Tool: Bash (curl)
    Preconditions: 服务器运行中
    Steps:
      1. curl -X POST http://localhost:3000/api/messages/import -H 'Content-Type: application/json' -d '{"message":{"name":"BadFrame","frameSize":8},"signals":[{"name":"","startBit":0,"bitLength":8}]}'
      2. 检查响应 status 400
    Expected Result: status 400, body 包含验证错误
    Failure Indicators: status 201 或 500
    Evidence: .sisyphus/evidence/task-3-import-validation.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `feat(signals): use deterministic signal ID with duplicate detection`
  - Files: `server/routes/messages.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 4. 集成测试 + 全量回归验证

  **What to do**:
  - 创建 `tests/signal-duplicate.test.ts`，包含端到端 API 集成测试：
    - 创建 message → 创建 signal → 确认 ID 为确定性 hash → 再次创建相同 signal → 确认 409
    - 创建 message → 创建 signal A → 修改 signal A 的 name（PUT）→ 确认 ID 不变
    - 创建 message → 导入 signals → 确认 IDs 为确定性 hash → 再次导入冲突 → 确认 409
    - 不同 messageId 下相同 name/startBit/bitLength → 应产生不同 ID（因为 messageId 不同）
    - 同一 messageId 下不同 startBit → 应产生不同 ID
  - 运行全量测试 `npx vitest run` 确认所有测试（新旧）通过
  - 运行 `npx tsc --noEmit` 确认类型检查通过

  **Must NOT do**:
  - 不得修改已有测试的预期行为
  - 不得跳过任何已有测试

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 测试文件创建 + 运行验证，不涉及复杂逻辑
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 无 UI

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: FINAL
  - **Blocked By**: Task 2, Task 3

  **References**:

  **Test References**:
  - `tests/tags.test.ts` — 查看现有集成测试风格和 DB mock/fixture 模式
  - `tests/datatype.test.ts` — 查看测试组织方式
  - `tests/example.test.ts` — 查看测试示例

  **API/Type References**:
  - `shared/signal-id.ts` — Task 1 创建的工具函数，集成测试需验证端到端一致性
  - `server/routes/signals.ts` — Task 2 修改后的 signal 创建路由
  - `server/routes/messages.ts` — Task 3 修改后的 import 路由

  **WHY Each Reference Matters**:
  - 现有测试文件展示了测试风格，新测试应保持一致
  - 需要了解项目中测试如何 mock 数据库或使用 test fixtures
  - 集成测试需要验证从 API 到 ID 生成的完整链路

  **Acceptance Criteria**:

  - [ ] `tests/signal-duplicate.test.ts` 创建完成
  - [ ] `npx vitest run` → ALL pass（新旧测试全部通过）
  - [ ] `npx tsc --noEmit` → 0 errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全量测试通过
    Tool: Bash
    Preconditions: Tasks 1-3 已完成
    Steps:
      1. 运行 `npx vitest run`
      2. 检查所有测试通过
    Expected Result: 全部测试 PASS，0 failures
    Failure Indicators: 任何测试 FAIL
    Evidence: .sisyphus/evidence/task-4-all-tests.txt

  Scenario: 类型检查通过
    Tool: Bash
    Preconditions: 同上
    Steps:
      1. 运行 `npx tsc --noEmit`
      2. 检查无错误
    Expected Result: 无 TypeScript 编译错误
    Failure Indicators: 任何 type error
    Evidence: .sisyphus/evidence/task-4-typecheck.txt
  ```

  **Commit**: YES
  - Message: `test(signals): add integration tests for duplicate detection`
  - Files: `tests/signal-duplicate.test.ts`
  - Pre-commit: `npx vitest run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git diff). Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(signal-id): add deterministic signal ID generation utility` — shared/signal-id.ts, tests/signal-id.test.ts
- **Task 2+3**: `feat(signals): use deterministic signal ID with duplicate detection` — server/routes/signals.ts, server/routes/messages.ts
- **Task 4**: `test(signals): add integration tests for duplicate detection` — tests/signal-duplicate.test.ts

---

## Success Criteria

### Verification Commands
```bash
# 工具函数测试
npx vitest run tests/signal-id.test.ts
# Expected: All tests pass

# 全量测试
npx vitest run
# Expected: All tests pass, 0 failures

# 类型检查
npx tsc --noEmit
# Expected: No errors

# 手动验证确定性
node -e "const { generateSignalId } = require('./shared/signal-id.ts'); console.log(generateSignalId('msg-1', 'EngineSpeed', 0, 8))"
# Expected: Same 16-char hex string every time
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass
- [x] `generateSignalId` 对相同输入始终返回相同结果
- [x] 重复创建返回 409 Conflict
- [x] 导入路由也使用确定性 ID
