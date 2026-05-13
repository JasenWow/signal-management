# Signal 标签系统 + 数据类型

## TL;DR

> **Quick Summary**: 为 Signal 和 Message 添加全局标签系统（颜色标识、自由输入、自动补全、按标签筛选）以及 Signal 数据类型字段（完整 C 类型、bitLength 联动）。
> 
> **Deliverables**:
> - 标签 CRUD API + 数据库表结构
> - 标签自动补全输入组件
> - Signal 列表标签筛选栏
> - 独立标签管理页
> - Signal 数据类型字段（DB + API + UI）
> - Vitest 测试框架 + 单元测试
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Shared types → DB migration → Tags API → Tag components → Tag management page

---

## Context

### Original Request
用户希望为 signal 添加标签系统（多对多、可筛选）和数据类型（用于解析时使用，参考 C 数据类型）。

### Interview Summary
**Key Discussions**:
- 标签范围: 全局共享（所有 message/signal 共用一套标签池）
- 标签创建: 自由输入 + 自动补全（新标签自动创建）
- 标签目标: Signal + Message 都支持
- 标签颜色: 需要颜色标识（类似 GitHub labels）
- 标签筛选: Signal 列表上方 + 独立标签管理页
- 数据类型: 完整 C 类型列表（uint8/int8/.../float64/boolean）
- 类型-bitLength 联动: 选类型自动设置 bitLength
- 测试: 配置 vitest + 单元测试

**Research Findings**:
- `SignalDataType` 已存在于 `shared/types.ts`（4 种类型），需扩展为完整 C 类型
- `SIGNAL_DATA_TYPES` 常量已存在，需更新
- Signal 接口和 DB 表中未使用 data_type
- 无测试基础设施
- Version 系统存储快照，需包含标签和数据类型

### Metis Review
**Identified Gaps** (addressed):
- bitLength 联动方向: 仅 data_type → bitLength（单向），反向不影响
- 现有信号迁移: data_type=null（不推断），UI 显示 "未设置"
- 标签重命名: v1 不支持（删除+重建）
- Version 快照: 包含标签和数据类型
- 标签删除: 级联删除所有关联
- 自动补全: 前缀匹配，不区分大小写
- 重复标签分配: 幂等（不报错）
- 标签颜色: 预定义调色板（12 色）

---

## Work Objectives

### Core Objective
添加全局标签系统（多对多关系、颜色、自动补全、筛选、管理页）和 Signal 数据类型字段（C 类型、bitLength 联动）。

### Concrete Deliverables
- `shared/types.ts` 更新: 扩展 SignalDataType、Tag/SignalTag/MessageTag 接口
- `shared/constants.ts` 更新: 完整数据类型列表、标签颜色调色板、data_type↔bitLength 映射
- DB migration: tags、signal_tags、message_tags 表 + signals.data_type 列
- `server/routes/tags.ts`: 标签 CRUD + 关联管理 API
- 更新 `server/routes/signals.ts`: 包含 data_type 和标签
- 更新 `server/routes/messages.ts`: 包含标签
- 更新版本快照: 包含标签和数据类型
- `src/components/TagInput/TagInput.tsx`: 自动补全标签输入组件
- `src/components/TagFilter/TagFilter.tsx`: 标签筛选栏组件
- 更新 `SignalForm.tsx`: 添加数据类型选择器
- 更新 `SignalList.tsx`: 显示标签 + 集成筛选
- 更新 `MessageEditor.tsx`: Message 标签管理
- `src/components/TagManager/TagManager.tsx`: 独立标签管理页
- 新增 React Router 路由: `/tags`
- 更新 Zustand store: 标签相关状态管理
- Vitest 配置 + 单元测试

### Definition of Done
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] 所有 vitest 测试通过
- [ ] 标签 CRUD 功能完整（创建、读取、更新、删除）
- [ ] Signal/Message 可以添加/移除标签
- [ ] 标签筛选可以过滤 Signal 列表
- [ ] 数据类型选择器与 bitLength 正确联动
- [ ] 独立标签管理页可正常访问和操作

### Must Have
- 全局标签系统（tags + signal_tags + message_tags 表）
- 标签 CRUD API
- 标签自动补全输入组件
- Signal 列表标签筛选
- 独立标签管理页（查看所有标签、每个标签下的 signals/messages）
- Signal 数据类型字段（完整 C 类型列表）
- data_type ↔ bitLength 单向联动（类型→长度）
- 标签和数据类型包含在 version 快照中
- Vitest 配置 + 核心功能单元测试

### Must NOT Have (Guardrails)
- ❌ 标签模糊搜索（仅前缀匹配）
- ❌ 标签重命名功能（v1 删除+重建）
- ❌ 标签合并功能
- ❌ 标签描述字段（仅 name + color）
- ❌ 自定义颜色选择器（仅预定义调色板）
- ❌ 批量标签操作（v1 仅单个操作）
- ❌ bitLength 反向联动 data_type（仅单向）
- ❌ 版本 diff 显示标签变更
- ❌ 测试使用真实 DB（使用 mock）
- ❌ 为已有信号推断 data_type（迁移后为 null）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: YES (Tests-after)
- **Framework**: vitest
- **If setup needed**: Configure vitest as part of implementation

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **Unit tests**: Use Bash - Run vitest, assert pass count

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1:  Shared types + constants [quick]
├── Task 2:  Vitest configuration [quick]
├── Task 3:  DB migration for tags + data_type [quick]
└── Task 4:  Tag API routes [quick]

Wave 2 (After Wave 1 - core components):
├── Task 5:  Update signals API (data_type + tags) [unspecified-high]
├── Task 6:  Update messages API (tags) [unspecified-high]
├── Task 7:  Update version snapshots (include tags + data_type) [deep]
├── Task 8:  Zustand tag store [quick]
├── Task 9:  TagInput component with autocomplete [visual-engineering]
└── Task 10: TagFilter component [visual-engineering]

Wave 3 (After Wave 2 - UI integration):
├── Task 11: Update SignalForm (data_type selector) [visual-engineering]
├── Task 12: Update SignalList (tag display + filter) [visual-engineering]
├── Task 13: Update MessageEditor (tag management) [visual-engineering]
├── Task 14: Tag management page + route [visual-engineering]
└── Task 15: Unit tests for tags + data_type [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T3 → T5 → T9 → T12 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1    | -         | 3,4,5,6,7,8,9,10,11 | 1 |
| 2    | -         | 15 | 1 |
| 3    | 1         | 4,5,6,7 | 1 |
| 4    | 1,3       | 5,6,8,9,15 | 1 |
| 5    | 1,3,4     | 11,12,15 | 2 |
| 6    | 1,3,4     | 13,15 | 2 |
| 7    | 3,5,6     | - | 2 |
| 8    | 1,4       | 9,10,11,12,13,14 | 2 |
| 9    | 1,8       | 11,13 | 2 |
| 10   | 1,8       | 12 | 2 |
| 11   | 1,5,8,9   | - | 3 |
| 12   | 8,10,5    | - | 3 |
| 13   | 6,8,9     | - | 3 |
| 14   | 8,9,10    | - | 3 |
| 15   | 2,4,5,6   | - | 3 |

### Agent Dispatch Summary

- **Wave 1 (4 tasks)**: T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2 (6 tasks)**: T5 → `unspecified-high`, T6 → `unspecified-high`, T7 → `deep`, T8 → `quick`, T9 → `visual-engineering`, T10 → `visual-engineering`
- **Wave 3 (5 tasks)**: T11 → `visual-engineering`, T12 → `visual-engineering`, T13 → `visual-engineering`, T14 → `visual-engineering`, T15 → `unspecified-high`
- **FINAL (4 tasks)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Shared Types + Constants Update

  **What to do**:
  - 更新 `shared/types.ts`:
    - 扩展 `SignalDataType` 为完整 C 类型联合: `'uint8' | 'int8' | 'uint16' | 'int16' | 'uint32' | 'int32' | 'uint64' | 'int64' | 'float32' | 'float64' | 'boolean'`
    - 在 `Signal` 接口中添加 `dataType: SignalDataType | null` 字段（在 `factor` 之后）
    - 在 `CreateSignalInput` 中添加 `dataType?: SignalDataType`
    - 在 `UpdateSignalInput` 中添加 `dataType?: SignalDataType`
    - 新增 `Tag` 接口: `{ id: string; name: string; color: string; createdAt: string; updatedAt: string }`
    - 新增 `CreateTagInput`: `{ name: string; color?: string }`
    - 新增 `UpdateTagInput`: `{ name?: string; color?: string }`
  - 更新 `shared/constants.ts`:
    - 替换 `SIGNAL_DATA_TYPES` 为完整列表: `['uint8', 'int8', 'uint16', 'int16', 'uint32', 'int32', 'uint64', 'int64', 'float32', 'float64', 'boolean'] as const`
    - 新增 `DATA_TYPE_BIT_LENGTH_MAP`: `{ uint8: 8, int8: 8, uint16: 16, int16: 16, uint32: 32, int32: 32, uint64: 64, int64: 64, float32: 32, float64: 64, boolean: 1 } as const`
    - 新增 `DEFAULT_TAG_COLORS`: 12 色预定义调色板数组（如 `['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6', '#F59E0B', '#6366F1']`）

  **Must NOT do**:
  - 不修改已有 Message / Version 接口的基础字段
  - 不删除现有的 `ByteOrder`、`BitNumbering` 等类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义修改，无逻辑变更，只需在两个文件中添加/修改类型
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1 (with Tasks 2)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8, 9, 10, 11
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `shared/types.ts:1-129` - 现有类型定义模式（camelCase 接口、Input 后缀、DbRow 映射模式）
  - `shared/constants.ts:1-13` - 现有常量定义模式（`as const` 断言）

  **WHY Each Reference Matters**:
  - types.ts: 需要完全遵循现有的命名和导出风格（interface + Input 后缀）
  - constants.ts: 需要用 `as const` 保持类型安全，参考现有 `SIGNAL_DATA_TYPES` 的写法

  **Acceptance Criteria**:
  - [ ] `shared/types.ts` 包含扩展后的 `SignalDataType`、`Tag`、`CreateTagInput`、`UpdateTagInput` 接口
  - [ ] `shared/constants.ts` 包含 `DATA_TYPE_BIT_LENGTH_MAP` 和 `DEFAULT_TAG_COLORS`
  - [ ] `npx tsc --noEmit` 无错误

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: TypeScript compilation passes after type changes
    Tool: Bash
    Preconditions: Clean working directory
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code is 0
    Expected Result: Exit code 0, no type errors
    Failure Indicators: Any TypeScript errors referencing new types
    Evidence: .sisyphus/evidence/task-1-tsc-pass.txt
  ```

  **Commit**: YES
  - Message: `feat(types): add tag and data type definitions`
  - Files: `shared/types.ts`, `shared/constants.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. Vitest Configuration

  **What to do**:
  - 安装 vitest: `npm install -D vitest`
  - 创建 `vitest.config.ts`:
    ```ts
    import { defineConfig } from 'vitest/config'
    import path from 'path'
    export default defineConfig({
      resolve: {
        alias: {
          '@shared': path.resolve(__dirname, './shared'),
          '@': path.resolve(__dirname, './src'),
        },
      },
      test: {
        globals: true,
      },
    })
    ```
  - 在 `package.json` scripts 中添加: `"test": "vitest run"`, `"test:watch": "vitest"`
  - 创建 `tests/` 目录
  - 创建一个示例测试 `tests/example.test.ts` 验证配置正确:
    ```ts
    import { describe, it, expect } from 'vitest'
    describe('vitest setup', () => {
      it('works', () => { expect(1 + 1).toBe(2) })
    })
    ```

  **Must NOT do**:
  - 不使用真实数据库连接（使用 mock）
  - 不配置覆盖率工具（v1 不需要）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的配置任务，创建配置文件 + 安装依赖
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 15
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `vite.config.ts` - 现有的 Vite 配置，复用 path alias 模式（`@shared` → `./shared`）
  - `tsconfig.json` - 检查 path alias 定义，确保 vitest alias 与 tsconfig 一致

  **WHY Each Reference Matters**:
  - vite.config.ts: vitest 配置需要与 Vite 使用相同的 path alias，否则 import 会失败

  **Acceptance Criteria**:
  - [ ] `npm test` 运行成功，1 test passed
  - [ ] `vitest.config.ts` 存在且配置了 `@shared` alias

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Vitest runs successfully
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run `npm test`
      2. Check output contains "1 passed"
      3. Check exit code is 0
    Expected Result: "Tests 1 passed", exit code 0
    Failure Indicators: "Cannot find module", "failed", non-zero exit
    Evidence: .sisyphus/evidence/task-2-vitest-setup.txt

  Scenario: Path alias resolves correctly
    Tool: Bash
    Preconditions: vitest configured
    Steps:
      1. Create test that imports from '@shared/constants'
      2. Run `npm test`
      3. Verify import resolves without error
    Expected Result: Import succeeds, test passes
    Failure Indicators: "Cannot find module @shared/constants"
    Evidence: .sisyphus/evidence/task-2-alias-resolve.txt
  ```

  **Commit**: YES
  - Message: `chore(test): configure vitest`
  - Files: `vitest.config.ts`, `package.json`, `tests/example.test.ts`
  - Pre-commit: `npm test`

- [x] 3. DB Migration for Tags + Data Type

  **What to do**:
  - 在 `server/db/schema.ts` 的 `SCHEMA_DDL` 中追加:
    ```sql
    CREATE TABLE IF NOT EXISTS tags (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      color       TEXT NOT NULL DEFAULT '#6B7280',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS signal_tags (
      signal_id   TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (signal_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS message_tags (
      message_id  TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (message_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_signal_tags_signal ON signal_tags(signal_id);
    CREATE INDEX IF NOT EXISTS idx_signal_tags_tag ON signal_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_message_tags_message ON message_tags(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_tags_tag ON message_tags(tag_id);
    ```
  - 在 `server/db/migrations.ts` 的 `migrations` 数组中添加新 migration:
    ```ts
    {
      name: '002_tags_and_data_type',
      up: `
        ALTER TABLE signals ADD COLUMN data_type TEXT DEFAULT NULL;
        -- tags/signal_tags/message_tags CREATE TABLE statements
      `,
    }
    ```
    注意: tags/signal_tags/message_tags 的 CREATE TABLE 已在 SCHEMA_DDL 中（IF NOT EXISTS），migration 只需 ALTER TABLE 添加 data_type 列。

  **Must NOT do**:
  - 不为已有信号推断 data_type 值（保持 NULL）
  - 不删除或修改现有表结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯 SQL migration，遵循现有模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 types)
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `server/db/schema.ts:1-71` - 现有 DDL 模式（表命名 snake_case、TEXT PRIMARY KEY、datetime defaults）
  - `server/db/migrations.ts:1-32` - 现有 migration 模式（name + up SQL、检查 _migrations 表）

  **WHY Each Reference Matters**:
  - schema.ts: 必须完全遵循现有命名约定（snake_case 列名、TEXT 类型 ID、datetime defaults）
  - migrations.ts: 新 migration 必须追加到数组中，使用 002_ 前缀

  **Acceptance Criteria**:
  - [ ] `schema.ts` 包含 tags、signal_tags、message_tags 的 CREATE TABLE
  - [ ] `migrations.ts` 包含 002_tags_and_data_type migration
  - [ ] 启动服务器后 `signals` 表有 `data_type` 列

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Server starts with new schema
    Tool: Bash
    Preconditions: DB file removed to force fresh creation
    Steps:
      1. `rm -f ./data/signal-mgmt.db`
      2. Start server with timeout: `timeout 5 npx tsx server/index.ts || true`
      3. Check server log contains "API server running"
    Expected Result: Server starts without SQL errors
    Failure Indicators: "SQLITE_ERROR", "table tags already exists"
    Evidence: .sisyphus/evidence/task-3-server-start.txt

  Scenario: Existing DB migration adds data_type column
    Tool: Bash
    Preconditions: Existing DB with signals table (no data_type column)
    Steps:
      1. Start server against existing DB
      2. Query: `sqlite3 ./data/signal-mgmt.db "PRAGMA table_info(signals)" | grep data_type`
    Expected Result: Output contains "data_type" column definition
    Failure Indicators: "duplicate column name" or no data_type column found
    Evidence: .sisyphus/evidence/task-3-migration.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add tags and data_type migration`
  - Files: `server/db/schema.ts`, `server/db/migrations.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 4. Tag CRUD API Routes

  **What to do**:
  - 创建 `server/routes/tags.ts`，导出 `tagRoutes(db: Database.Database)`:
    - `GET /` - 列出所有标签（按 name 排序）
    - `POST /` - 创建标签（name 必填，color 可选默认 `DEFAULT_TAG_COLORS[0]`）。name UNIQUE 约束，重复返回 409
    - `PUT /:id` - 更新标签（name、color 可选）
    - `DELETE /:id` - 删除标签（级联删除 signal_tags/message_tags 关联）
    - `POST /signals/:signalId/tags` - 为 signal 添加标签（body: `{ tagIds: string[] }`），幂等操作（INSERT OR IGNORE）
    - `DELETE /signals/:signalId/tags/:tagId` - 移除 signal 的标签
    - `POST /messages/:messageId/tags` - 为 message 添加标签（body: `{ tagIds: string[] }`）
    - `DELETE /messages/:messageId/tags/:tagId` - 移除 message 的标签
    - `GET /signals` - 查询有指定标签的 signals（query: `?tagId=xxx`），返回 signal 列表（带 message_id）
    - `GET /messages` - 查询有指定标签的 messages（query: `?tagId=xxx`）
  - 在 `server/index.ts` 中注册路由: `app.route('/api/tags', tagRoutes(db))`
  - DbRow → camelCase 映射函数: `mapTag(r: DbRow)` → `{ id, name, color, createdAt, updatedAt }`

  **Must NOT do**:
  - 不添加模糊搜索（仅按 tagId 精确查询）
  - 不添加标签重命名级联逻辑
  - 不添加标签合并端点

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准 CRUD 路由，完全遵循现有 Hono route 模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 1, 3)
  - **Parallel Group**: Wave 1 (after Tasks 1, 3)
  - **Blocks**: Tasks 5, 6, 8, 9, 15
  - **Blocked By**: Tasks 1, 3

  **References**:
  **Pattern References**:
  - `server/routes/signals.ts:1-109` - 完整的 Hono route 模式（mapSignal、randomUUID、db.prepare）
  - `server/routes/messages.ts:1-125` - CRUD + import 模式（GET list、GET detail、POST、PUT、DELETE）
  - `server/index.ts:21-24` - 路由注册模式（`app.route('/api/tags', tagRoutes(db))`）

  **API/Type References**:
  - `shared/types.ts` - `Tag`, `CreateTagInput`, `UpdateTagInput`（Task 1 添加）

  **WHY Each Reference Matters**:
  - signals.ts: 必须完全复制 mapXxx 模式、error response 格式（`{ error: '...' }`）、HTTP status codes
  - messages.ts: 参考其 GET list/detail 返回格式
  - server/index.ts: 路由注册位置必须在现有路由之后

  **Acceptance Criteria**:
  - [ ] `GET /api/tags` 返回空数组 `[]`（200）
  - [ ] `POST /api/tags` 创建标签成功（201）
  - [ ] 重复 name 创建返回 409
  - [ ] `DELETE /api/tags/:id` 删除成功（200）
  - [ ] `POST /api/tags/signals/:signalId/tags` 关联成功
  - [ ] `server/index.ts` 注册了 tag routes

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Tag CRUD lifecycle
    Tool: Bash (curl)
    Preconditions: Server running on port 3001
    Steps:
      1. `curl -s http://localhost:3001/api/tags` → assert returns `[]`
      2. `curl -s -X POST http://localhost:3001/api/tags -H 'Content-Type: application/json' -d '{"name":"Engine","color":"#EF4444"}'` → assert 201, response has `id`, `name="Engine"`
      3. `curl -s http://localhost:3001/api/tags` → assert returns array with 1 tag
      4. `curl -s -X POST http://localhost:3001/api/tags -H 'Content-Type: application/json' -d '{"name":"Engine"}'` → assert 409
      5. `curl -s -X PUT http://localhost:3001/api/tags/{id} -H 'Content-Type: application/json' -d '{"name":"Powertrain"}'` → assert 200, name updated
      6. `curl -s -X DELETE http://localhost:3001/api/tags/{id}` → assert `{ success: true }`
      7. `curl -s http://localhost:3001/api/tags` → assert `[]`
    Expected Result: All CRUD operations succeed with correct status codes
    Failure Indicators: Wrong status code, missing fields, SQL errors
    Evidence: .sisyphus/evidence/task-4-tag-crud.txt

  Scenario: Tag association with signal
    Tool: Bash (curl)
    Preconditions: Tag and signal exist
    Steps:
      1. Create tag "Safety" via POST
      2. Create message + signal
      3. `curl -s -X POST http://localhost:3001/api/tags/signals/{signalId}/tags -H 'Content-Type: application/json' -d '{"tagIds":["{tagId}"]}'` → assert 200
      4. Duplicate: same POST → assert 200 (idempotent, no error)
      5. `curl -s -X DELETE http://localhost:3001/api/tags/signals/{signalId}/tags/{tagId}` → assert 200
    Expected Result: Tag assigned and removed successfully
    Failure Indicators: 404, 500, or non-idempotent duplicate
    Evidence: .sisyphus/evidence/task-4-tag-association.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add tag CRUD routes`
  - Files: `server/routes/tags.ts`, `server/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 5. Update Signals API (data_type + tags)

  **What to do**:
  - 更新 `server/routes/signals.ts`:
    - `mapSignal` 函数添加 `dataType: r.data_type` 映射
    - `POST /messages/:messageId/signals` 添加 `data_type` 到 INSERT 语句（`body.dataType ?? null`）
    - `PUT /signals/:id` 添加 `data_type` 到 UPDATE 语句
    - 新增 `GET /messages/:messageId/signals` 返回带标签的 signals:
      - 查询 signal_tags 获取每个 signal 的标签列表
      - 返回格式: `{ ...signal, tags: Tag[] }`
    - 或者在现有的 `GET /messages/:id`（在 messages.ts 中）返回 signals 时附带 tags
  - 更新 `mapSignal` 返回 `dataType: r.data_type ?? null`

  **Must NOT do**:
  - 不修改 URL 路由结构
  - 不改变现有的 signal 字段映射

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 SQL 查询修改和 join 逻辑，需要仔细处理
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 12, 15
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  **Pattern References**:
  - `server/routes/signals.ts:1-109` - 现有 signal CRUD 模式，需要在 mapSignal、INSERT、UPDATE 中添加字段
  - `server/routes/messages.ts:36-42` - `GET /:id` 返回 `{ ...message, signals: [...] }` 的模式，signals 需要附带 tags

  **API/Type References**:
  - `shared/types.ts:Signal` - 需要返回 `dataType` 字段
  - `shared/types.ts:Tag` - signal 需要返回关联的 `tags: Tag[]`

  **WHY Each Reference Matters**:
  - signals.ts: 在现有 mapSignal 中添加 dataType 字段，在 INSERT/UPDATE 中添加 data_type 列
  - messages.ts: 该路由返回 signals 列表，需要让每个 signal 附带其 tags

  **Acceptance Criteria**:
  - [ ] `mapSignal` 返回 `dataType` 字段
  - [ ] 创建 signal 时可以设置 `dataType`
  - [ ] 更新 signal 时可以修改 `dataType`
  - [ ] `GET /api/messages/:id` 返回的每个 signal 包含 `tags: Tag[]`

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Signal with data_type
    Tool: Bash (curl)
    Preconditions: Server running, message exists
    Steps:
      1. `curl -s -X POST http://localhost:3001/api/messages/{msgId}/signals -H 'Content-Type: application/json' -d '{"name":"TestSig","startBit":0,"bitLength":16,"dataType":"uint16"}'` → assert 201
      2. Read back: `curl -s http://localhost:3001/api/messages/{msgId}` → signals[0].dataType === "uint16"
      3. Update: `curl -s -X PUT http://localhost:3001/api/signals/{sigId} -H 'Content-Type: application/json' -d '{"dataType":"int16"}'` → assert 200
      4. Read back → signals[0].dataType === "int16"
    Expected Result: data_type persists correctly through create/update/read
    Failure Indicators: dataType is null when it shouldn't be, or update doesn't persist
    Evidence: .sisyphus/evidence/task-5-signal-datatype.txt

  Scenario: Signal with tags in message response
    Tool: Bash (curl)
    Preconditions: Signal with assigned tags exists
    Steps:
      1. Create tag, assign to signal
      2. `curl -s http://localhost:3001/api/messages/{msgId}` → signals[0].tags is array with tag objects
    Expected Result: Each signal has `tags` array with `{ id, name, color }` objects
    Failure Indicators: `tags` field missing or empty when tags assigned
    Evidence: .sisyphus/evidence/task-5-signal-tags.txt
  ```

  **Commit**: YES
  - Message: `feat(api): update signals with data_type and tags`
  - Files: `server/routes/signals.ts`, `server/routes/messages.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 6. Update Messages API (tags)

  **What to do**:
  - 更新 `server/routes/messages.ts`:
    - `GET /` - 列出所有 messages，每个 message 附带 tags 数组
    - `GET /:id` - 单个 message 附带 tags 数组
    - `POST /` - 创建 message 时可选附带 tagIds
    - `PUT /:id` - 更新 message 时不直接改 tags（通过 tags API 管理）
    - `POST /import` - 导入时可选附带 tags
  - 新增辅助函数: `getMessageTags(db, messageId)` → `Tag[]`
  - 在 `mapMessage` 或查询层附加 tags

  **Must NOT do**:
  - 不改变 message 的核心字段（name, frameSize 等）
  - tags 的增删通过 Task 4 的 tags API 操作，不在 message CRUD 中

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要在多个路由中添加 join 查询逻辑
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 7, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 15
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  **Pattern References**:
  - `server/routes/messages.ts:1-125` - 现有 message 路由，需要在返回中附加 tags

  **API/Type References**:
  - `shared/types.ts:Tag` - message 需要返回 `tags: Tag[]`

  **WHY Each Reference Matters**:
  - messages.ts: GET / 和 GET /:id 返回格式需要包含 tags 数组

  **Acceptance Criteria**:
  - [ ] `GET /api/messages` 每个 message 包含 `tags: Tag[]`
  - [ ] `GET /api/messages/:id` 包含 `tags: Tag[]`
  - [ ] 无标签时返回 `tags: []`

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Message with tags
    Tool: Bash (curl)
    Preconditions: Message with assigned tags exists
    Steps:
      1. Create message, create tag, assign tag to message
      2. `curl -s http://localhost:3001/api/messages` → messages[0].tags is array
      3. `curl -s http://localhost:3001/api/messages/{msgId}` → tags array with tag objects
    Expected Result: Both list and detail include tags
    Failure Indicators: tags missing or malformed
    Evidence: .sisyphus/evidence/task-6-message-tags.txt

  Scenario: Message without tags
    Tool: Bash (curl)
    Preconditions: Fresh message with no tags
    Steps:
      1. `curl -s http://localhost:3001/api/messages/{msgId}` → tags: []
    Expected Result: Empty tags array
    Failure Indicators: tags is null/undefined instead of []
    Evidence: .sisyphus/evidence/task-6-message-no-tags.txt
  ```

  **Commit**: YES
  - Message: `feat(api): update messages with tags`
  - Files: `server/routes/messages.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 7. Update Version Snapshots (include tags + data_type)

  **What to do**:
  - 更新 `server/routes/versions.ts` 和相关类型:
    - `VersionSnapshot` 接口（`shared/types.ts`）添加:
      - `messageTags: Tag[]` (message 级别的标签)
      - signal 对象已包含 `dataType` 和 `tags`（由 Task 5 更新）
    - 创建版本快照时:
      - 查询 `message_tags` 获取 message 的标签列表
      - signals 已自带 tags（Task 5 实现）
      - 存储到 snapshot JSON 中
    - 恢复版本时:
      - 恢复 message tags: 清除 message_tags → 插入快照中的 tags
      - signals 的 data_type 和 tags 已随 signal 数据恢复
      - 对于已删除的 tag（快照中有但 DB 中不存在），自动重新创建

  **Must NOT do**:
  - 不在版本 diff 中显示标签变更
  - 不改变 version 的基本结构（id, parentId, message, snapshot, diff）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解版本系统的完整流程（创建快照、diff 计算、恢复），修改涉及多个路径
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 8, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: None (no downstream depends on this)
  - **Blocked By**: Tasks 3, 5, 6

  **References**:
  **Pattern References**:
  - `server/routes/versions.ts` - 完整的版本路由（创建快照、列表、恢复）
  - `shared/types.ts:VersionSnapshot` - 现有快照结构

  **WHY Each Reference Matters**:
  - versions.ts: 需要修改 create snapshot 和 restore 两条路径
  - VersionSnapshot: 需要扩展接口

  **Acceptance Criteria**:
  - [ ] 创建快照时包含 messageTags
  - [ ] signals 快照包含 dataType 和 tags
  - [ ] 恢复版本时标签正确恢复

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Version snapshot includes tags and data_type
    Tool: Bash (curl)
    Preconditions: Message with tagged signals, data_type set
    Steps:
      1. Create version: `curl -s -X POST http://localhost:3001/api/versions -d '{"messageId":"{msgId}","message":"test"}'`
      2. Get version detail: check snapshot contains messageTags and signal dataType/tags
    Expected Result: Snapshot JSON contains tags and data_type
    Failure Indicators: Missing messageTags field, signal tags empty
    Evidence: .sisyphus/evidence/task-7-version-snapshot.txt

  Scenario: Restore version restores tags
    Tool: Bash (curl)
    Preconditions: Version with tags exists, current state has different tags
    Steps:
      1. Add new tag to signal
      2. Restore previous version
      3. Check signal tags match the restored version's snapshot
    Expected Result: Tags restored to snapshot state
    Failure Indicators: Tags remain in current state, not snapshot state
    Evidence: .sisyphus/evidence/task-7-version-restore.txt
  ```

  **Commit**: YES
  - Message: `feat(versions): include tags and data_type in snapshots`
  - Files: `server/routes/versions.ts`, `shared/types.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 8. Zustand Tag Store

  **What to do**:
  - 创建 `src/stores/tagStore.ts`:
    - State: `tags: Tag[]`, `loading: boolean`
    - Actions:
      - `loadTags()` - GET /api/tags → set tags
      - `createTag(name: string, color?: string)` - POST /api/tags → add to tags
      - `updateTag(id, data)` - PUT /api/tags/:id → update in tags
      - `deleteTag(id)` - DELETE /api/tags/:id → remove from tags
      - `assignTagsToSignal(signalId, tagIds)` - POST /api/tags/signals/:id/tags
      - `removeTagFromSignal(signalId, tagId)` - DELETE /api/tags/signals/:id/tags/:tagId
      - `assignTagsToMessage(messageId, tagIds)` - POST /api/tags/messages/:id/tags
      - `removeTagFromMessage(messageId, tagId)` - DELETE /api/tags/messages/:id/tags/:tagId
    - 遵循 `messageStore.ts` 的 fetch-then-set 模式
  - 更新 `src/stores/messageStore.ts`:
    - `selectMessage` 返回的 data 中已包含 tags（Task 6），确认 activeMessage 包含 tags 字段
    - `activeSignals` 中已包含 tags 和 dataType（Task 5），确认映射正确

  **Must NOT do**:
  - 不重构现有 messageStore 的核心逻辑
  - 不添加 tag filter state（filter state 放在组件 local state）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准 Zustand store，完全遵循 messageStore 模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10, 11, 12, 13, 14
  - **Blocked By**: Tasks 1, 4

  **References**:
  **Pattern References**:
  - `src/stores/messageStore.ts:1-168` - 完整的 Zustand store 模式（create、fetch、set、error handling）

  **API/Type References**:
  - `shared/types.ts:Tag`, `CreateTagInput`, `UpdateTagInput` - tag 类型

  **WHY Each Reference Matters**:
  - messageStore.ts: 必须完全复制其 create() 模式、async action 模式、fetch 错误处理模式

  **Acceptance Criteria**:
  - [ ] `tagStore.ts` 存在，导出 `useTagStore`
  - [ ] 所有 API action 都有对应的 fetch 调用
  - [ ] `npx tsc --noEmit` 通过

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Tag store loads and manages tags
    Tool: Bash
    Preconditions: Server running with tags in DB
    Steps:
      1. `npx tsc --noEmit` → no type errors
      2. Verify tagStore exports match expected interface
    Expected Result: No TypeScript errors, store compiles
    Failure Indicators: Type errors in tagStore.ts
    Evidence: .sisyphus/evidence/task-8-tag-store.txt
  ```

  **Commit**: YES
  - Message: `feat(store): add tag store`
  - Files: `src/stores/tagStore.ts`, `src/stores/messageStore.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 9. TagInput Component with Autocomplete

  **What to do**:
  - 创建 `src/components/TagInput/TagInput.tsx`:
    - Props: `{ selectedTags: Tag[], onAdd: (tag: Tag) => void, onRemove: (tagId: string) => void }`
    - 显示已选标签（带颜色圆点和 × 删除按钮）
    - 输入框支持前缀自动补全（不区分大小写）
    - 输入匹配规则: `tag.name.toLowerCase().startsWith(input.toLowerCase())`
    - 回车或点击补全项添加标签
    - 如果输入内容不匹配任何现有标签，显示 "创建 'xxx'" 选项
    - 点击创建后调用 `onAdd` 并自动创建新标签（通过 tagStore.createTag）
    - 使用 Tailwind CSS 样式，匹配现有 UI 风格
  - 创建 `src/components/TagInput/index.ts` barrel export

  **Must NOT do**:
  - 不实现模糊搜索（仅前缀匹配）
  - 不实现键盘上下箭头导航
  - 不实现自定义颜色选择器（创建新标签使用默认颜色）
  - 不添加标签描述字段

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 前端 UI 组件，需要交互逻辑和样式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 13
  - **Blocked By**: Tasks 1, 8

  **References**:
  **Pattern References**:
  - `src/components/SignalEditor/SignalForm.tsx:1-239` - 现有表单组件模式（useState、受控组件、Tailwind 样式）
  - `src/components/SignalEditor/SignalList.tsx:1-69` - 列表项模式（颜色圆点、flex 布局）

  **WHY Each Reference Matters**:
  - SignalForm.tsx: 参考其 Tailwind 样式模式（border rounded px py text-sm）
  - SignalList.tsx: 标签显示的颜色圆点参考 signal 列表中的颜色显示

  **Acceptance Criteria**:
  - [ ] TagInput 组件接受 selectedTags、onAdd、onRemove props
  - [ ] 输入时显示自动补全下拉
  - [ ] 回车添加匹配标签或创建新标签
  - [ ] 已选标签可点击 × 移除

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Tag autocomplete shows matching tags
    Tool: Playwright
    Preconditions: Dev server running, tags "Engine" and "Temperature" exist
    Steps:
      1. Navigate to page with TagInput component
      2. Click tag input field
      3. Type "en"
      4. Assert dropdown shows "Engine"
      5. Click "Engine" suggestion
      6. Assert "Engine" tag chip appears in selected tags
    Expected Result: Autocomplete shows "Engine", clicking adds it
    Failure Indicators: No dropdown, wrong suggestion, tag not added
    Evidence: .sisyphus/evidence/task-9-tag-autocomplete.png

  Scenario: Create new tag when no match
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Type "Brakes" in tag input (no existing tag)
      2. Assert shows "Create 'Brakes'" option
      3. Click or press Enter
      4. Assert "Brakes" tag chip appears with default color
    Expected Result: New tag created and added
    Failure Indicators: No "Create" option, tag not created
    Evidence: .sisyphus/evidence/task-9-tag-create.png

  Scenario: Remove tag from selection
    Tool: Playwright
    Preconditions: Tag already selected
    Steps:
      1. Click × button on tag chip
      2. Assert tag chip is removed
    Expected Result: Tag removed from selection
    Failure Indicators: Tag still visible
    Evidence: .sisyphus/evidence/task-9-tag-remove.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add TagInput component with autocomplete`
  - Files: `src/components/TagInput/TagInput.tsx`, `src/components/TagInput/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 10. TagFilter Component

  **What to do**:
  - 创建 `src/components/TagFilter/TagFilter.tsx`:
    - Props: `{ selectedTagIds: string[], onToggle: (tagId: string) => void }`
    - 显示所有可用标签为可点击的彩色标签按钮
    - 已选中的标签高亮显示（加深背景色）
    - 点击切换选中/取消
    - 标签过多时（>20）折叠显示 "+N more" 按钮
    - 使用 Tailwind CSS 样式
  - 创建 `src/components/TagFilter/index.ts` barrel export

  **Must NOT do**:
  - 不实现多选逻辑（组件只负责展示和 toggle，筛选逻辑在使用组件的地方）
  - 不实现拖拽排序

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 纯 UI 展示组件
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1, 8

  **References**:
  **Pattern References**:
  - `src/components/SignalEditor/SignalList.tsx:30-67` - 列表项样式参考
  - `src/App.tsx:78-96` - 左侧 sidebar 布局参考

  **WHY Each Reference Matters**:
  - SignalList.tsx: 标签按钮的颜色圆点样式参考
  - App.tsx: TagFilter 放在 Signal list 上方，需要匹配 sidebar 宽度和 padding

  **Acceptance Criteria**:
  - [ ] TagFilter 组件接受 selectedTagIds、onToggle props
  - [ ] 标签按钮显示颜色和名称
  - [ ] 点击切换选中状态
  - [ ] >20 标签时折叠

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Tag filter toggles selection
    Tool: Playwright
    Preconditions: Dev server running, tags exist
    Steps:
      1. Navigate to page with TagFilter
      2. Click a tag button
      3. Assert button appearance changes (highlighted)
      4. Click again
      5. Assert button returns to unselected state
    Expected Result: Toggle works correctly
    Failure Indicators: Visual state doesn't change
    Evidence: .sisyphus/evidence/task-10-tag-filter-toggle.png

  Scenario: Tag filter overflow collapses
    Tool: Playwright
    Preconditions: >20 tags exist
    Steps:
      1. Navigate to page with TagFilter
      2. Assert only ~20 tags visible
      3. Assert "+N more" button visible
      4. Click "+N more"
      5. Assert all tags visible
    Expected Result: Collapse/expand works
    Failure Indicators: All tags always shown, or no expand button
    Evidence: .sisyphus/evidence/task-10-tag-filter-overflow.png
  ```

  **Commit**: YES (group with Task 9)
  - Message: `feat(ui): add TagInput and TagFilter components`
  - Files: `src/components/TagFilter/TagFilter.tsx`, `src/components/TagFilter/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 11. Update SignalForm (data_type selector)

  **What to do**:
  - 更新 `src/components/SignalEditor/SignalForm.tsx`:
    - 添加 `dataType` state: `useState<SignalDataType | null>(editingSignal?.dataType ?? null)`
    - 在表单中添加数据类型选择器（在 byteOrder 选择器旁边或上方）:
      - `<select>` 下拉框，选项来自 `SIGNAL_DATA_TYPES` 常量
      - 包含一个空选项 "" → "未设置"（对应 null）
      - 分组显示: 整数类型（uint8/int8/.../uint64/int64）、浮点类型（float32/float64）、其他（boolean）
    - **bitLength 联动逻辑**:
      - 当 dataType 改变且新值在 `DATA_TYPE_BIT_LENGTH_MAP` 中时，自动设置 bitLength
      - 仅在创建模式或 dataType 首次设置时自动更新（编辑模式下如果用户手动改了 bitLength，不覆盖）
      - 简化实现: dataType 变化时总是更新 bitLength（单向联动）
    - 在 handleSubmit 中将 `dataType` 包含在 create/update payload 中
    - 添加 TagInput 组件用于标签管理:
      - 使用 `useTagStore` 获取已有标签
      - 编辑模式: 显示 signal 已有关联的标签
      - 创建/更新时: 保存标签关联
    - 集成 tagStore 的 `assignTagsToSignal` 和 `removeTagFromSignal`

  **Must NOT do**:
  - 不实现 bitLength → dataType 的反向联动
  - 不在信号创建前强制要求选择数据类型

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 表单 UI 修改，需要交互逻辑
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12, 13, 14, 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 5, 8, 9

  **References**:
  **Pattern References**:
  - `src/components/SignalEditor/SignalForm.tsx:1-239` - 完整的表单模式，需要在 byteOrder 选择器旁添加 dataType
  - `src/components/SignalEditor/SignalForm.tsx:163-193` - 3 列 grid 布局参考（byteOrder、factor、offset 行）

  **API/Type References**:
  - `shared/constants.ts:DATA_TYPE_BIT_LENGTH_MAP` - dataType → bitLength 映射表
  - `shared/constants.ts:SIGNAL_DATA_TYPES` - 完整数据类型列表

  **WHY Each Reference Matters**:
  - SignalForm.tsx: 在现有 3 列 grid 的 byteOrder 旁添加 dataType select，参考 byteOrder 的 select 样式
  - DATA_TYPE_BIT_LENGTH_MAP: select onChange 时查询此映射，自动更新 bitLength state

  **Acceptance Criteria**:
  - [ ] SignalForm 有 data_type select 下拉框
  - [ ] 选择 data_type 后 bitLength 自动更新
  - [ ] TagInput 组件集成在表单中
  - [ ] 提交时包含 dataType 和 tags

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Data type auto-updates bitLength
    Tool: Playwright
    Preconditions: Dev server running, message selected
    Steps:
      1. Click "+ Add" to create new signal
      2. Set name to "TestRPM"
      3. Select "uint16" from data type dropdown
      4. Assert bitLength field shows "16"
      5. Change to "float64"
      6. Assert bitLength field shows "64"
    Expected Result: bitLength auto-updates when dataType changes
    Failure Indicators: bitLength stays at default value
    Evidence: .sisyphus/evidence/task-11-datatype-linkage.png

  Scenario: Create signal with data type and tags
    Tool: Playwright
    Preconditions: Dev server running, tags exist
    Steps:
      1. Open signal form
      2. Set name, select dataType="int8", add tag "Safety"
      3. Submit
      4. Assert new signal appears in list with correct info
    Expected Result: Signal created with dataType="int8" and tag "Safety"
    Failure Indicators: Signal missing dataType or tags
    Evidence: .sisyphus/evidence/task-11-create-with-datatype.png
  ```

  **Commit**: YES
  - Message: `feat(ui): update SignalForm with data type selector`
  - Files: `src/components/SignalEditor/SignalForm.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 12. Update SignalList (tag display + filter)

  **What to do**:
  - 更新 `src/App.tsx` 左侧 sidebar:
    - 在 Signal 列表上方添加 TagFilter 组件
    - 添加 `filterTagIds` local state
    - TagFilter onToggle 更新 filterTagIds
  - 更新 `src/components/SignalEditor/SignalList.tsx`:
    - 每个 signal 项显示标签（颜色小圆点 + 标签名，最多显示 3 个，超出显示 "+N"）
    - 根据 filterTagIds 过滤显示的 signals:
      - 无选中标签: 显示全部
      - 有选中标签: 显示包含任一选中标签的 signal（OR 逻辑）
    - 使用 `useTagStore` 获取标签列表

  **Must NOT do**:
  - 不在 signal 列表项中显示完整的标签颜色
  - 不实现 AND 筛选逻辑（仅 OR）
  - 不修改 signal 的排序逻辑

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件修改，涉及过滤逻辑和样式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 13, 14, 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 10, 5

  **References**:
  **Pattern References**:
  - `src/components/SignalEditor/SignalList.tsx:1-69` - 现有 signal 列表，需要添加 tag 显示和筛选
  - `src/App.tsx:78-96` - 左侧 sidebar 布局，需要在 Signals 标题和列表之间插入 TagFilter

  **API/Type References**:
  - `shared/types.ts:Signal` - signal 包含 `tags: Tag[]` 和 `dataType: SignalDataType | null`

  **WHY Each Reference Matters**:
  - SignalList.tsx: 在每个 signal 项的右侧或名称下方添加小标签显示
  - App.tsx: TagFilter 插入位置在 `<h2>Signals</h2>` 和 `<SignalList>` 之间

  **Acceptance Criteria**:
  - [ ] TagFilter 显示在 Signal 列表上方
  - [ ] 点击标签可以筛选 signal 列表
  - [ ] 每个列表项显示关联的标签（最多 3 个 + "+N"）
  - [ ] 无选中标签时显示全部 signals

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Filter signals by tag
    Tool: Playwright
    Preconditions: Signals with different tags exist (S1="Engine", S2="Safety", S3="Engine"+"Safety")
    Steps:
      1. Click "Engine" tag in filter bar
      2. Assert only S1 and S3 visible in list
      3. Click "Engine" again to deselect
      4. Assert all signals visible again
      5. Click "Engine" and "Safety" (multi-select)
      6. Assert all 3 signals visible (OR logic)
    Expected Result: Filtering works correctly
    Failure Indicators: Wrong signals shown/hidden
    Evidence: .sisyphus/evidence/task-12-signal-filter.png

  Scenario: Tags display in signal list items
    Tool: Playwright
    Preconditions: Signal with tags exists
    Steps:
      1. Look at signal list item with tags
      2. Assert tag names visible as small chips/dots
    Expected Result: Tags visible in list items
    Failure Indicators: No tag display in list
    Evidence: .sisyphus/evidence/task-12-tag-display.png
  ```

  **Commit**: YES
  - Message: `feat(ui): update SignalList with tags and filter`
  - Files: `src/components/SignalEditor/SignalList.tsx`, `src/App.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 13. Update MessageEditor (tag management)

  **What to do**:
  - 更新 `src/components/MessageEditor/MessageEditor.tsx`:
    - 在 message 编辑区域添加 TagInput 组件
    - 编辑 activeMessage 时显示已关联的标签
    - 添加/移除标签时调用 tagStore 的 `assignTagsToMessage` / `removeTagFromMessage`
    - 显示位置: 在 message name 和 frame size 下方，或者作为折叠区域
    - 样式: 紧凑的标签输入，匹配 header 栏的高度

  **Must NOT do**:
  - 不在 header 的下拉选择器中添加标签筛选（独立标签管理页处理）
  - 不改变 message 创建/删除/导入逻辑

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件集成
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12, 14, 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 8, 9

  **References**:
  **Pattern References**:
  - `src/components/MessageEditor/MessageEditor.tsx:1-185` - 现有 message 编辑器，标签添加在 name/frameSize 行之后

  **WHY Each Reference Matters**:
  - MessageEditor.tsx: 在 message 编辑区域添加 TagInput，需要匹配现有的 inline 编辑样式

  **Acceptance Criteria**:
  - [ ] Message 编辑时显示已关联标签
  - [ ] 可以添加新标签
  - [ ] 可以移除已有标签
  - [ ] 标签变更持久化到后端

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Add and remove tags from message
    Tool: Playwright
    Preconditions: Message selected, tag exists
    Steps:
      1. Find tag input in message editor area
      2. Type tag name and select from autocomplete
      3. Assert tag appears as chip
      4. Reload page
      5. Assert tag still present
      6. Click × on tag chip
      7. Assert tag removed
    Expected Result: Tags persist across reload
    Failure Indicators: Tags lost on reload
    Evidence: .sisyphus/evidence/task-13-message-tags.png
  ```

  **Commit**: YES
  - Message: `feat(ui): update MessageEditor with tags`
  - Files: `src/components/MessageEditor/MessageEditor.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 14. Tag Management Page + Route

  **What to do**:
  - 创建 `src/components/TagManager/TagManager.tsx`:
    - 显示所有标签列表（颜色 + 名称 + 使用数量统计）
    - 创建新标签（名称 + 颜色选择）
    - 编辑标签（名称 + 颜色）
    - 删除标签（确认弹窗，提示关联数量）
    - 点击标签显示该标签下的所有 signals 和 messages
    - 布局: 左侧标签列表 + 右侧详情（类似 master-detail）
  - 创建 `src/components/TagManager/index.ts` barrel export
  - 更新 `src/App.tsx`:
    - 添加 React Router 路由 `/tags` → TagManager 组件
    - 在 header 中添加 "Tags" 导航按钮/链接（在 Import 按钮旁边）
    - 当前 `/:messageId` 路由不受影响

  **Must NOT do**:
  - 不实现标签合并
  - 不实现批量删除
  - 不使用独立 Layout 组件（复用 App.tsx 的布局结构）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 新页面 UI，涉及组件设计、布局和路由
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12, 13, 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 8, 9, 10

  **References**:
  **Pattern References**:
  - `src/App.tsx:1-125` - 路由模式和布局结构
  - `src/components/SignalEditor/SignalList.tsx:1-69` - 列表项样式参考
  - `src/components/MessageEditor/MessageEditor.tsx:149-183` - modal 表单模式参考

  **WHY Each Reference Matters**:
  - App.tsx: 理解路由注册方式，添加 /tags 路由
  - SignalList.tsx: 标签列表的列表项样式参考
  - MessageEditor.tsx: 创建/编辑标签时的 modal 参考

  **Acceptance Criteria**:
  - [ ] `/tags` 路由可访问
  - [ ] 显示所有标签列表
  - [ ] 可以创建、编辑、删除标签
  - [ ] 点击标签显示关联的 signals 和 messages
  - [ ] Header 中有 "Tags" 导航入口

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Tag management page CRUD
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to /tags
      2. Assert tag list visible (may be empty)
      3. Click "New Tag" or equivalent
      4. Enter name "TestTag" and select a color
      5. Submit
      6. Assert "TestTag" appears in list
      7. Click "TestTag" → assert detail panel shows
      8. Click edit → change name to "TestTag2" → submit
      9. Assert name updated
      10. Click delete → confirm → assert removed from list
    Expected Result: Full CRUD works on management page
    Failure Indicators: Tag not created, not editable, not deletable
    Evidence: .sisyphus/evidence/task-14-tag-manager.png

  Scenario: Tag detail shows associated items
    Tool: Playwright
    Preconditions: Tag assigned to signal and message
    Steps:
      1. Navigate to /tags
      2. Click tag with assignments
      3. Assert detail panel lists associated signals and messages
      4. Click signal name → navigates to message with signal highlighted
    Expected Result: Associated items visible and navigable
    Failure Indicators: Empty detail panel, links broken
    Evidence: .sisyphus/evidence/task-14-tag-detail.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add tag management page`
  - Files: `src/components/TagManager/TagManager.tsx`, `src/components/TagManager/index.ts`, `src/App.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [x] 15. Unit Tests for Tags + Data Type

  **What to do**:
  - 创建 `tests/tags.test.ts`:
    - 测试 Tag CRUD API（使用 mock fetch 或直接 curl 测试）
    - 测试 tag-signal 关联（添加、移除、幂等性）
    - 测试 tag-message 关联
    - 测试重复创建标签（应返回 409）
    - 测试删除标签级联删除关联
  - 创建 `tests/datatype.test.ts`:
    - 测试 `DATA_TYPE_BIT_LENGTH_MAP` 映射正确性
    - 测试 signal 创建时设置 dataType
    - 测试 signal 更新时修改 dataType
    - 测试 dataType 为 null 的处理
  - 测试策略: 使用 vitest + 直接 HTTP 请求（启动测试服务器或 mock）

  **Must NOT do**:
  - 不测试数据库 migration 本身
  - 不使用真实数据库文件（使用内存 DB 或 mock）
  - 不为现有功能写回归测试

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要编写多个测试文件，设计 mock 策略
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12, 13, 14)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 4, 5, 6

  **References**:
  **Pattern References**:
  - `vitest.config.ts` (Task 2 创建) - 测试配置
  - `tests/example.test.ts` (Task 2 创建) - 示例测试模式

  **API/Type References**:
  - `shared/constants.ts:DATA_TYPE_BIT_LENGTH_MAP` - 需要测试的映射表
  - `server/routes/tags.ts` (Task 4 创建) - 需要测试的 API
  - `server/routes/signals.ts` - 需要测试 data_type 功能

  **WHY Each Reference Matters**:
  - vitest.config.ts: 确保 path alias 在测试中正确解析
  - tags.ts / signals.ts: 测试需要覆盖这些 API 的关键行为

  **Acceptance Criteria**:
  - [ ] `npm test` 所有测试通过
  - [ ] 至少 8 个测试用例（tags 4+, data_type 4+）
  - [ ] 覆盖 happy path 和 error cases

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: All tests pass
    Tool: Bash
    Preconditions: All implementation tasks complete
    Steps:
      1. Run `npm test`
      2. Assert all tests pass (0 failures)
      3. Assert test count >= 8
    Expected Result: "Tests X passed", 0 failed, X >= 8
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-15-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `test: add unit tests for tags and data_type`
  - Files: `tests/tags.test.ts`, `tests/datatype.test.ts`
  - Pre-commit: `npm test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run typecheck` + `npm run build` + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start dev server. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: empty tags, duplicate tags, non-standard bitLength, version restore with tags. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(types): add tag and data type definitions` - shared/types.ts, shared/constants.ts
- **Wave 1**: `chore(test): configure vitest` - vitest.config.ts, package.json
- **Wave 1**: `feat(db): add tags and data_type migration` - server/db/schema.ts, server/db/migrations.ts
- **Wave 1**: `feat(api): add tag CRUD routes` - server/routes/tags.ts, server/index.ts
- **Wave 2**: `feat(api): update signals with data_type and tags` - server/routes/signals.ts
- **Wave 2**: `feat(api): update messages with tags` - server/routes/messages.ts
- **Wave 2**: `feat(versions): include tags and data_type in snapshots` - server/routes/versions.ts
- **Wave 2**: `feat(store): add tag store` - src/stores/tagStore.ts
- **Wave 2**: `feat(ui): add TagInput and TagFilter components` - src/components/TagInput/, src/components/TagFilter/
- **Wave 3**: `feat(ui): update SignalForm with data type selector` - src/components/SignalEditor/SignalForm.tsx
- **Wave 3**: `feat(ui): update SignalList with tags and filter` - src/components/SignalEditor/SignalList.tsx
- **Wave 3**: `feat(ui): update MessageEditor with tags` - src/components/MessageEditor/MessageEditor.tsx
- **Wave 3**: `feat(ui): add tag management page` - src/components/TagManager/, src/App.tsx
- **Wave 3**: `test: add unit tests for tags and data_type` - tests/

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck           # Expected: no errors
npm run build               # Expected: successful build
npx vitest run              # Expected: all tests pass
curl http://localhost:3001/api/tags  # Expected: [] (empty array)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Tag CRUD works end-to-end
- [ ] Data type selector with bitLength linkage works
- [ ] Tag filter on Signal list works
- [ ] Tag management page accessible at /tags
