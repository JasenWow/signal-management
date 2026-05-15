import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '../server/db/schema.js'
import { runMigrations } from '../server/db/migrations.js'
import messageRoutes from '../server/routes/messages.js'
import signalRoutes from '../server/routes/signals.js'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  runMigrations(db, sqlite)
  return db
}

describe('Signal Duplicate Detection and Deterministic ID', () => {
  let db: ReturnType<typeof createTestDb>
  let messages: ReturnType<typeof messageRoutes>
  let signals: ReturnType<typeof signalRoutes>

  beforeEach(() => {
    db = createTestDb()
    messages = messageRoutes(db)
    signals = signalRoutes(db)
  })

  describe('POST /messages/:messageId/signals - deterministic ID and duplicate detection', () => {
    it('creates signal with deterministic 16 hex ID', async () => {
      const msgRes = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'TestFrame', frameSize: 8 }),
        })
      )
      const msg = await msgRes.json()
      const messageId = msg.id

      const signalRes = await signals.request(
        new Request(`http://localhost/messages/${messageId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )

      expect(signalRes.status).toBe(201)
      const signal = await signalRes.json()
      expect(signal.id).toMatch(/^[0-9a-f]{16}$/)
      expect(signal.id).toHaveLength(16)
    })

    it('returns 409 on duplicate signal creation', async () => {
      const msgRes = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'TestFrame', frameSize: 8 }),
        })
      )
      const msg = await msgRes.json()
      const messageId = msg.id

      await signals.request(
        new Request(`http://localhost/messages/${messageId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )

      const dupRes = await signals.request(
        new Request(`http://localhost/messages/${messageId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )

      expect(dupRes.status).toBe(409)
      const dupBody = await dupRes.json()
      expect(dupBody.error).toContain('already exists')
    })

    it('signal ID remains unchanged after updating signal name', async () => {
      const msgRes = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'TestFrame', frameSize: 8 }),
        })
      )
      const msg = await msgRes.json()
      const messageId = msg.id

      const signalRes = await signals.request(
        new Request(`http://localhost/messages/${messageId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )
      const signal = await signalRes.json()
      const originalId = signal.id

      const updateRes = await signals.request(
        new Request(`http://localhost/signals/${originalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'NewEngineSpeed' }),
        })
      )

      expect(updateRes.status).toBe(200)
      const updatedSignal = await updateRes.json()
      expect(updatedSignal.id).toBe(originalId)
      expect(updatedSignal.name).toBe('NewEngineSpeed')
    })
  })

  describe('POST /import - deterministic ID and duplicate detection', () => {
    it('imports signals with deterministic 16 hex IDs', async () => {
      const importRes = await messages.request(
        new Request('http://localhost/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: { name: 'TestFrame', frameSize: 8 },
            signals: [
              { name: 'Sig1', startBit: 0, bitLength: 8 },
              { name: 'Sig2', startBit: 8, bitLength: 16 },
            ],
          }),
        })
      )

      expect(importRes.status).toBe(201)
      const imported = await importRes.json()
      expect(imported.signals).toHaveLength(2)

      for (const signal of imported.signals) {
        expect(signal.id).toMatch(/^[0-9a-f]{16}$/)
        expect(signal.id).toHaveLength(16)
      }
    })

    it('returns 409 when importing duplicate signals', async () => {
      const import1Res = await messages.request(
        new Request('http://localhost/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: { name: 'TestFrame', frameSize: 8 },
            signals: [{ name: 'Sig1', startBit: 0, bitLength: 8 }],
          }),
        })
      )
      expect(import1Res.status).toBe(201)
      const imported = await import1Res.json()
      const messageId = imported.id

      const dupRes = await signals.request(
        new Request(`http://localhost/messages/${messageId}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Sig1', startBit: 0, bitLength: 8 }),
        })
      )

      expect(dupRes.status).toBe(409)
      const dupBody = await dupRes.json()
      expect(dupBody.error).toContain('already exists')
    })
  })

  describe('ID determinism across different messages', () => {
    it('different messageId + same name/startBit/bitLength produces different IDs', async () => {
      const msg1Res = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Frame1', frameSize: 8 }),
        })
      )
      const msg1 = await msg1Res.json()

      const msg2Res = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Frame2', frameSize: 8 }),
        })
      )
      const msg2 = await msg2Res.json()

      const sig1Res = await signals.request(
        new Request(`http://localhost/messages/${msg1.id}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )
      const sig1 = await sig1Res.json()

      const sig2Res = await signals.request(
        new Request(`http://localhost/messages/${msg2.id}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )
      const sig2 = await sig2Res.json()

      expect(sig1.id).not.toBe(sig2.id)
    })

    it('same messageId + different startBit produces different IDs', async () => {
      const msgRes = await messages.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'TestFrame', frameSize: 8 }),
        })
      )
      const msg = await msgRes.json()

      const sig1Res = await signals.request(
        new Request(`http://localhost/messages/${msg.id}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 0, bitLength: 8 }),
        })
      )
      const sig1 = await sig1Res.json()

      const sig2Res = await signals.request(
        new Request(`http://localhost/messages/${msg.id}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'EngineSpeed', startBit: 8, bitLength: 8 }),
        })
      )
      const sig2 = await sig2Res.json()

      expect(sig1.id).not.toBe(sig2.id)
    })
  })
})
