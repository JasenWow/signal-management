# Signal Code 编码规则设计

## 背景

Signal 当前使用 SHA-256 哈希前 16 位作为 ID（如 `a3f2c8d1e4b50679`），虽然唯一但不可读。需要添加一个人类可读的编码（code），方便口头交流、文档引用和快速索引。

## 设计

### 格式

```
{message_prefix}-{NN}
```

- **message_prefix**：从消息名称提取前 3 个大写字母（去除非字母字符后取前 3 位）
  - `BMS_Status` → `BMS`
  - `Charger_Control` → `CHA`
  - `Pack_Voltage` → `PAC`
  - 短于 3 字符的名称左填充（如 `VC` → `VC0`）
- **NN**：消息内信号的创建序号，零填充两位（01-99）
  - 序号基于消息内已有的最大 code 序号 +1

### 示例

| 消息 | 信号名 | Code |
|---|---|---|
| BMS_Status | total_voltage | BMS-01 |
| BMS_Status | current | BMS-02 |
| Charger_Control | voltage_limit | CHA-01 |

### 属性

1. **创建时分配，永不改变** — 即使消息改名或信号移动位置
2. **消息内唯一** — code 在同一消息内唯一；跨消息前缀可能重复，但组合唯一
3. **自动生成** — 创建信号时后端自动计算，用户无需手动输入
4. **不可编辑** — 创建后只读

### 不涉及

- 不替换现有 `id` 字段（哈希 ID 仍作为主键）
- 不影响 Flink 解析管道（code 是管理工具专用的人可读标识）
- 不影响版本系统（版本快照中的 Signal 会自然包含 code 字段）

## 实现计划

### 1. 代码层：signal-code 生成函数

新建 `src/foundation/lib/signal-code.ts`：

```
generateSignalCode(messageName: string, existingCodes: string[]): string
```

- 从 messageName 提取前 3 个大写字母作为 prefix
- 从 existingCodes 中找到最大序号 +1
- 返回 `{prefix}-{NN}`

### 2. DB schema：添加 code 列

`server/db/schema.ts` — signals 表添加 `code` 列：
- `code: text('code').notNull()`
- 添加 unique index on `(messageId, code)`

### 3. DB migration：回填已有数据

`server/db/migrations.ts` — 添加迁移：
- ALTER TABLE signals ADD COLUMN code TEXT
- 回填已有信号：按 messageId 分组，按 sortOrder 排序，分配 code
- 添加 UNIQUE INDEX

### 4. API 路由：创建信号时生成 code

`server/routes/signals.ts`：
- POST 创建信号时，查询同消息已有 code，生成新 code
- POST 批量导入时，为每个信号生成 code

### 5. TypeScript 类型

`src/foundation/types.ts`：
- Signal 接口添加 `code: string`

### 6. UI 展示

- `SignalList`：在信号名称前显示 code（如 `BMS-01`）
- `SignalForm`：编辑模式时只读展示 code

### 7. 测试

- `signal-code.test.ts`：测试 code 生成逻辑（prefix 提取、序号递增、边界情况）
- 迁移测试：验证回填正确性
