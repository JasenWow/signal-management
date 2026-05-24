# Signal Code 编码规则 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a human-readable signal code (e.g. `BMS-01`) to every signal for quick reference and indexing.

**Architecture:** New `code` field on signals, auto-generated at creation from the message name prefix + sequential number. Stored in DB, displayed in UI. Never changes after creation.

**Tech Stack:** TypeScript, Drizzle ORM, SQLite, React, Hono, Bun test

---

### Task 1: Signal Code 生成函数 + 测试

**Files:**
- Create: `src/foundation/lib/signal-code.ts`
- Create: `src/foundation/lib/signal-code.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/foundation/lib/signal-code.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { generateSignalCode, extractMessagePrefix } from './signal-code'

describe('extractMessagePrefix', () => {
  it('extracts first 3 uppercase letters from snake_case name', () => {
    expect(extractMessagePrefix('BMS_Status')).toBe('BMS')
  })

  it('extracts first 3 uppercase letters from CamelCase name', () => {
    expect(extractMessagePrefix('ChargerControl')).toBe('CHA')
  })

  it('pads short names to 3 chars', () => {
    expect(extractMessagePrefix('VC')).toBe('VC0')
  })

  it('handles single char name', () => {
    expect(extractMessagePrefix('X')).toBe('X00')
  })

  it('skips non-letter characters', () => {
    expect(extractMessagePrefix('123_ABC')).toBe('ABC')
  })

  it('lowercase names are uppercased', () => {
    expect(extractMessagePrefix('voltage')).toBe('VOL')
  })
})

describe('generateSignalCode', () => {
  it('generates first code for message with no existing codes', () => {
    expect(generateSignalCode('BMS_Status', [])).toBe('BMS-01')
  })

  it('increments from existing codes', () => {
    expect(generateSignalCode('BMS_Status', ['BMS-01'])).toBe('BMS-02')
  })

  it('finds max seq from unordered existing codes', () => {
    expect(generateSignalCode('BMS_Status', ['BMS-03', 'BMS-01', 'BMS-05'])).toBe('BMS-06')
  })

  it('ignores codes from different prefix', () => {
    expect(generateSignalCode('Charger_Control', ['BMS-01', 'BMS-02'])).toBe('CHA-01')
  })

  it('pads to 3 chars for short message names', () => {
    expect(generateSignalCode('VC', [])).toBe('VC0-01')
  })

  it('formats seq as zero-padded two digits', () => {
    const codes = Array.from({ length: 9 }, (_, i) => `BMS-${String(i + 1).padStart(2, '0')}`)
    expect(generateSignalCode('BMS_Status', codes)).toBe('BMS-10')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/foundation/lib/signal-code.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/foundation/lib/signal-code.ts`:

```typescript
export function extractMessagePrefix(messageName: string): string {
  const letters = messageName.replace(/[^a-zA-Z]/g, '').toUpperCase()
  const padded = letters.padEnd(3, '0')
  return padded.slice(0, 3)
}

export function generateSignalCode(messageName: string, existingCodes: string[]): string {
  const prefix = extractMessagePrefix(messageName)

  let maxSeq = 0
  for (const code of existingCodes) {
    if (code.startsWith(prefix + '-')) {
      const seqPart = code.slice(prefix.length + 1)
      const seq = parseInt(seqPart, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
  }

  const seq = String(maxSeq + 1).padStart(2, '0')
  return `${prefix}-${seq}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/foundation/lib/signal-code.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/foundation/lib/signal-code.ts src/foundation/lib/signal-code.test.ts
git commit -m "feat: add signal code generation function with tests"
```

---

### Task 2: DB Schema + Migration — 添加 code 列

**Files:**
- Modify: `server/db/schema.ts:22-44` (signals table)
- Modify: `server/db/migrations.ts:76-81` (add migration)

- [ ] **Step 1: Add `code` column to schema**

In `server/db/schema.ts`, add `code` column to signals table, after the `id` line (line 24):

```typescript
// In signals table definition, after id: text('id').primaryKey(),
code: text('code').notNull(),
```

Add unique index on (messageId, code) — add to the index array at the end of the signals table definition:

```typescript
// In the signals table index array, add:
index('idx_signals_message_code').on(t.messageId, t.code),
```

The full signals table definition should be:

```typescript
export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  startBit: integer('start_bit').notNull(),
  bitLength: integer('bit_length').notNull(),
  byteOrder: text('byte_order').notNull().default('big'),
  factor: real('factor').notNull().default(1.0),
  offset: real('offset').notNull().default(0.0),
  unit: text('unit').notNull().default(''),
  minimum: real('minimum'),
  maximum: real('maximum'),
  valueTableId: text('value_table_id').references(() => valueTables.id, { onDelete: 'set null' }),
  dataType: text('data_type'),
  color: text('color').notNull().default('#10B981'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
}, (t) => [
  index('idx_signals_message').on(t.messageId),
  index('idx_signals_start_bit').on(t.messageId, t.startBit),
  index('idx_signals_message_code').on(t.messageId, t.code),
])
```

- [ ] **Step 2: Add migration for existing databases**

In `server/db/migrations.ts`, add a new migration to the `MIGRATIONS` array:

```typescript
{
  name: '003_signal_code',
  up: `
    ALTER TABLE signals ADD COLUMN code TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_signals_message_code ON signals(message_id, code);
  `,
},
```

This adds the column with a default empty string. Backfill happens in Task 3.

- [ ] **Step 3: Commit**

```bash
git add server/db/schema.ts server/db/migrations.ts
git commit -m "feat: add code column to signals schema and migration"
```

---

### Task 3: API — 创建信号时生成 code

**Files:**
- Modify: `server/routes/signals.ts` (single signal creation)
- Modify: `server/routes/messages.ts` (bulk import)
- Modify: `tests/signal-duplicate.test.ts` (verify code in responses)

- [ ] **Step 1: Update single signal creation in `server/routes/signals.ts`**

At the top of `server/routes/signals.ts`, add import:

```typescript
import { generateSignalCode } from '../../src/foundation/lib/signal-code.js'
```

In the `POST /messages/:messageId/signals` handler, after the line that computes `sortOrder` (around line 30), add code generation:

```typescript
const existingCodes = db.select({ code: signals.code })
  .from(signals)
  .where(eq(signals.messageId, messageId))
  .all()
  .map((r) => r.code)

const messageRow = db.select({ name: schema.messages.name })
  .from(schema.messages)
  .where(eq(schema.messages.id, messageId))
  .get()

const code = generateSignalCode(messageRow!.name, existingCodes)
```

Then in the `db.insert(signals).values({...})` call, add `code` after `id`:

```typescript
db.insert(signals).values({
  id, code, messageId, name: body.name, description: body.description ?? '',
  startBit: body.startBit, bitLength: body.bitLength,
  byteOrder: body.byteOrder ?? 'big', factor: body.factor ?? 1.0,
  offset: body.offset ?? 0.0, unit: body.unit ?? '',
  minimum: body.minimum ?? null, maximum: body.maximum ?? null,
  valueTableId: body.valueTableId ?? null, dataType: body.dataType ?? null,
  color: body.color ?? '#10B981', sortOrder, createdAt: now, updatedAt: now,
}).run()
```

- [ ] **Step 2: Update bulk import in `server/routes/messages.ts`**

At the top, add import:

```typescript
import { generateSignalCode } from '../../src/foundation/lib/signal-code.js'
```

In the `POST /import` handler, inside the `db.transaction` block, before the signal loop, generate codes for all signals:

After the line `const now = new Date().toISOString()` (around line 107), add:

```typescript
// Pre-generate all signal codes for this message
const signalCodes: string[] = []
let codeSeq = 0
for (const s of body.signals) {
  codeSeq++
  signalCodes.push(`${extractMessagePrefix(body.message.name)}-${String(codeSeq).padStart(2, '0')}`)
}
```

Also import `extractMessagePrefix`:

```typescript
import { generateSignalCode, extractMessagePrefix } from '../../src/foundation/lib/signal-code.js'
```

Then in the loop where signals are inserted (around line 128), use `signalCodes[i]`:

```typescript
tx.insert(signals).values({
  id: signalId, code: signalCodes[i], messageId, name: s.name, description: s.description ?? '',
  startBit: s.startBit, bitLength: s.bitLength,
  byteOrder: s.byteOrder ?? 'big', factor: s.factor ?? 1.0,
  offset: s.offset ?? 0.0, unit: s.unit ?? '',
  minimum: s.minimum ?? null, maximum: s.maximum ?? null,
  valueTableId: null, dataType: null, color: s.color ?? '#10B981',
  sortOrder: s.sortOrder ?? i, createdAt: now, updatedAt: now,
}).run()
```

- [ ] **Step 3: Update integration tests**

In `tests/signal-duplicate.test.ts`, add assertions for the `code` field in the existing test cases.

In the "creates signal with deterministic 16 hex ID" test, after `expect(signal.id).toHaveLength(16)`, add:

```typescript
expect(signal.code).toBe('TES-01')
```

In the "imports signals with deterministic 16 hex IDs" test, after the id assertions in the loop, add:

```typescript
expect(imported.signals[0].code).toBe('TES-01')
expect(imported.signals[1].code).toBe('TES-02')
```

Add a new test case at the end of the file:

```typescript
describe('Signal Code Generation', () => {
  it('assigns sequential codes within a message', async () => {
    const msgRes = await messages.request(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'BMS_Status', frameSize: 8 }),
      })
    )
    const msg = await msgRes.json()

    const sig1Res = await signals.request(
      new Request(`http://localhost/messages/${msg.id}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Voltage', startBit: 0, bitLength: 16 }),
      })
    )
    const sig1 = await sig1Res.json()
    expect(sig1.code).toBe('BMS-01')

    const sig2Res = await signals.request(
      new Request(`http://localhost/messages/${msg.id}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Current', startBit: 16, bitLength: 16 }),
      })
    )
    const sig2 = await sig2Res.json()
    expect(sig2.code).toBe('BMS-02')
  })

  it('assigns independent codes per message', async () => {
    const msg1Res = await messages.request(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'BMS_Status', frameSize: 8 }),
      })
    )
    const msg1 = await msg1Res.json()

    const msg2Res = await messages.request(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Charger_Control', frameSize: 8 }),
      })
    )
    const msg2 = await msg2Res.json()

    const sig1Res = await signals.request(
      new Request(`http://localhost/messages/${msg1.id}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Voltage', startBit: 0, bitLength: 16 }),
      })
    )
    const sig1 = await sig1Res.json()
    expect(sig1.code).toBe('BMS-01')

    const sig2Res = await signals.request(
      new Request(`http://localhost/messages/${msg2.id}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'VoltageLimit', startBit: 0, bitLength: 16 }),
      })
    )
    const sig2 = await sig2Res.json()
    expect(sig2.code).toBe('CHA-01')
  })
})
```

- [ ] **Step 4: Run all tests**

Run: `bun test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/signals.ts server/routes/messages.ts tests/signal-duplicate.test.ts
git commit -m "feat: generate signal code on creation (API routes + tests)"
```

---

### Task 4: TypeScript 类型 + UI 展示

**Files:**
- Modify: `src/foundation/types.ts:16-36` (Signal interface)
- Modify: `src/domains/signal/components/signal-list.tsx` (show code)
- Modify: `src/domains/signal/components/signal-form.tsx` (show code in edit mode)

- [ ] **Step 1: Add `code` to Signal interface**

In `src/foundation/types.ts`, add `code: string` to the Signal interface after the `id` field:

```typescript
export interface Signal {
  id: string
  code: string
  messageId: string
  // ... rest unchanged
}
```

- [ ] **Step 2: Display code in SignalList**

In `src/domains/signal/components/signal-list.tsx`, in the `renderSignalRow` function, modify the signal name display to show the code as a prefix:

Change this line:
```tsx
<div className="font-medium truncate text-xs">{signal.name}</div>
```

To:
```tsx
<div className="font-medium truncate text-xs">
  <span className="text-gray-400 font-mono mr-1">{signal.code}</span>
  {signal.name}
</div>
```

- [ ] **Step 3: Show code in SignalForm edit mode**

In `src/domains/signal/components/signal-form.tsx`, after the `<h3>` title and before the error div, add a code display for edit mode:

```tsx
{editingSignal?.code && (
  <div className="text-xs text-gray-400 font-mono">Code: {editingSignal.code}</div>
)}
```

This goes between the `<h3>` tag and the `{error && ...}` block, around line 93.

- [ ] **Step 4: Run frontend build to verify**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/foundation/types.ts src/domains/signal/components/signal-list.tsx src/domains/signal/components/signal-form.tsx
git commit -m "feat: add code field to Signal type and display in UI"
```

---

### Task 5: 数据回填 + 全量测试验证

**Files:**
- Modify: `server/db/migrations.ts` (update migration 003 with backfill)

- [ ] **Step 1: Add backfill logic to migration**

Update the `003_signal_code` migration in `server/db/migrations.ts` to backfill existing signals:

```typescript
{
  name: '003_signal_code',
  up: `
    ALTER TABLE signals ADD COLUMN code TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_signals_message_code ON signals(message_id, code);
  `,
},
```

Then add a backfill function after `runMigrations`. The backfill needs to run in JS (not raw SQL) because we need the `extractMessagePrefix` logic:

```typescript
export function backfillSignalCodes(db: BunSQLiteDatabase<typeof schema>, sqlite?: Database) {
  const raw = sqlite ?? (db as any).session?.client ?? (db as any).driver
  if (!raw) return

  // Check if backfill is needed
  const uncoded = raw.query('SELECT id FROM signals WHERE code = \'\' LIMIT 1').get() as { id: string } | null
  if (!uncoded) return

  // Get all signals grouped by message, with message name
  const rows = raw.query(`
    SELECT s.id, s.message_id, s.sort_order, m.name as message_name
    FROM signals s JOIN messages m ON s.message_id = m.id
    WHERE s.code = ''
    ORDER BY s.message_id, s.sort_order
  `).all() as Array<{ id: string; message_id: string; sort_order: number; message_name: string }>

  const seqByMessage = new Map<string, number>()
  const stmt = raw.prepare('UPDATE signals SET code = ? WHERE id = ?')

  for (const row of rows) {
    let seq = seqByMessage.get(row.message_id) ?? 0
    seq++
    seqByMessage.set(row.message_id, seq)

    const prefix = row.message_name.replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, '0').slice(0, 3)
    const code = `${prefix}-${String(seq).padStart(2, '0')}`
    stmt.run(code, row.id)
  }
}
```

Then in `server/index.ts` (or wherever `runMigrations` is called), call `backfillSignalCodes` right after `runMigrations`.

Find where `runMigrations` is called:

Run: `grep -n "runMigrations" server/index.ts`

Add the import and call:
```typescript
import { runMigrations, backfillSignalCodes } from './db/migrations.js'
// ... existing runMigrations call ...
backfillSignalCodes(db, sqlite)
```

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: all PASS

- [ ] **Step 3: Manual verification — start dev server and check**

Run: `bun run dev`
Verify in browser: create a message, add signals, confirm codes appear in signal list.

- [ ] **Step 4: Commit**

```bash
git add server/db/migrations.ts server/index.ts
git commit -m "feat: backfill signal codes for existing data"
```
