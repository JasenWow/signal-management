# Signal ID Generation - Learnings

## Task 1: shared/signal-id.ts + tests/signal-id.test.ts

### What worked
- Used `createHash('sha256').update(payload).digest('hex').slice(0, 16)` pattern
- Used `JSON.stringify([messageId, name, startBit, bitLength])` for collision-safe serialization
- Validation checks for empty strings must use `.trim().length === 0` since whitespace-only strings pass `length === 0` but are invalid

### Key patterns
```typescript
// Proper validation for "non-empty" strings (catches whitespace-only)
if (typeof messageId !== 'string' || messageId.trim().length === 0) {
  throw new Error('messageId must be a non-empty string')
}
```

### Stats
- 20 test cases covering determinism, uniqueness, format, validation, Unicode, edge cases
- All tests pass

### References
- `shared/constants.ts` for export pattern
- `tests/datatype.test.ts` and `tests/tags.test.ts` for test style
## Task 2: server/routes/signals.ts update

### What was done
- Replaced `import { randomUUID } from 'crypto'` with `import { generateSignalId } from '../../shared/signal-id.js'`
- POST handler now calls `generateSignalId(messageId, body.name, body.startBit, body.bitLength)` instead of `randomUUID()`
- Wrapped INSERT in try-catch: UNIQUE/SQLITE_CONSTRAINT → 409 Conflict, re-throws other errors
- Wrapped `generateSignalId` call in try-catch: validation Error → 400 Bad Request

### Verification
- `npx tsc --noEmit` passes (no output = success)
- `npx vitest run` all 32 tests pass

### Notes
- PUT, DELETE, validate endpoints remain unchanged
- The duplicate detection is based on SQLite constraint error message check (UNIQUE or SQLITE_CONSTRAINT)

### Task 3: messages.ts import route update

### What was done
- Added `import { generateSignalId } from '../../shared/signal-id.js'`
- POST /import handler now uses `generateSignalId(messageId, s.name, s.startBit, s.bitLength)` for signal IDs instead of `randomUUID()`
- Signal INSERT wrapped in `db.transaction()` for atomicity
- Duplicate detection collects conflicting signal names, throws with `{ status: 409, conflictingSignals: [...] }`
- Validation errors from `generateSignalId` return 400 Bad Request
- Transaction rolls back on any error (all-or-nothing)

### Key patterns
```typescript
// Transaction with custom error status
const insertSignals = db.transaction((signals) => {
  const conflictingSignals: string[] = []
  for (...) {
    try {
      signalId = generateSignalId(...)
    } catch (err) {
      throw Object.assign(new Error(`Invalid signal "${s.name}": ${err.message}`), { status: 400 })
    }
    try {
      signalInsert.run(...)
    } catch (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('SQLITE_CONSTRAINT')) {
        conflictingSignals.push(s.name)
      }
      throw err
    }
  }
  if (conflictingSignals.length > 0) {
    throw Object.assign(
      new Error(`Signal(s) ${conflictingSignals.map(n => `"${n}"`).join(', ')} already exist`),
      { conflictingSignals, status: 409 }
    )
  }
})

try {
  insertSignals(body.signals)
} catch (err: any) {
  if (err.status === 409) return c.json({ error: err.message, conflictingSignals: err.conflictingSignals }, 409)
  if (err.status === 400) return c.json({ error: err.message }, 400)
  return c.json({ error: err.message }, 500)
}
```

### Verification
- `npx tsc --noEmit` passes
- `npx vitest run` all 32 tests pass
- POST / (message creation) still uses `randomUUID()` - NOT changed

## Task 4: Integration Tests (signal-duplicate.test.ts)

### Key Findings:
1. **Hono route matching**: Routes use `app.request()` for testing and need path matching WITHOUT `/api/messages` prefix
   - messageRoutes mounted at `/api/messages` in server/index.ts
   - BUT when using `app.request()` directly, path is relative to where route is mounted
   - `http://localhost/` works for message POST, NOT `/api/messages`
   
2. **Foreign key requirement**: Signals need a valid message_id that exists in messages table
   - Each test must create messages first
   - Using single shared DB instance works (signals reference messages in same DB)

3. **Import route duplicate detection**: The import route creates a NEW message each time, so duplicate detection across imports doesn't work as expected (same signal params = different messageId = different signal ID)
   - Import route creates new message with randomUUID, signals get deterministic IDs based on THAT messageId
   - Two imports with same signal params → different messageId → different signal IDs → no 409
   - Test correctly verifies duplicate by importing once, then trying to create signal with same params in that message

4. **Migration needed**: In-memory DB needs `ALTER TABLE signals ADD COLUMN data_type TEXT DEFAULT NULL;` after schema creation (migration 002)

5. **Single DB approach**: Using single shared DB for both messages and signals routes works correctly since signal foreign key references the same DB's messages table
