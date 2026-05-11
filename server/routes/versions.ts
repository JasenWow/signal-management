import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import * as jsondiffpatch from 'jsondiffpatch'
import type { VersionSnapshot } from '../../shared/types.js'

interface DbRow { [key: string]: unknown }

function mapMessage(r: DbRow) {
  return {
    id: r.id, name: r.name, description: r.description,
    frameSize: r.frame_size, byteOrder: r.byte_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

function mapSignal(r: DbRow) {
  return {
    id: r.id, messageId: r.message_id, name: r.name, description: r.description,
    startBit: r.start_bit, bitLength: r.bit_length, byteOrder: r.byte_order,
    factor: r.factor, offset: r.offset, unit: r.unit,
    minimum: r.minimum, maximum: r.maximum, valueTableId: r.value_table_id,
    color: r.color, sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

function mapEntry(r: DbRow) {
  return {
    id: r.id, valueTableId: r.value_table_id,
    rawValue: r.raw_value, displayValue: r.display_value,
    description: r.description, sortOrder: r.sort_order,
  }
}

export default function versionRoutes(db: Database.Database) {
  const app = new Hono()

  function buildSnapshot(messageId: string): VersionSnapshot {
    const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as DbRow
    const signalRows = db.prepare('SELECT * FROM signals WHERE message_id = ? ORDER BY start_bit').all(messageId) as DbRow[]

    const signals = signalRows.map(mapSignal)
    const valueTableIds = [...new Set(signals.map((s) => s.valueTableId).filter(Boolean))] as string[]
    const valueTables = valueTableIds.map((vtId) => {
      const vt = db.prepare('SELECT * FROM value_tables WHERE id = ?').get(vtId) as DbRow
      const entries = (db.prepare('SELECT * FROM value_table_entries WHERE value_table_id = ? ORDER BY sort_order, raw_value').all(vtId) as DbRow[]).map(mapEntry)
      return { ...mapMessage(vt).id === undefined ? {} : {
        id: vt.id, name: vt.name, description: vt.description,
        entries, createdAt: vt.created_at, updatedAt: vt.updated_at,
      } }
    }).filter(Boolean)

    return { message: mapMessage(msgRow), signals, valueTables }
  }

  app.post('/', async (c) => {
    const body = await c.req.json<{ messageId: string; message: string }>()
    const id = randomUUID()
    const now = new Date().toISOString()

    const snapshot = buildSnapshot(body.messageId)

    const parent = db
      .prepare('SELECT id, snapshot FROM versions WHERE message_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(body.messageId) as { id: string; snapshot: string } | undefined

    let diff: unknown = null
    if (parent) {
      const parentSnapshot = JSON.parse(parent.snapshot) as VersionSnapshot
      diff = jsondiffpatch.diff(parentSnapshot, snapshot)
    }

    db.prepare(
      `INSERT INTO versions (id, message_id, parent_id, message, snapshot, diff, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, body.messageId, parent?.id ?? null, body.message, JSON.stringify(snapshot), diff ? JSON.stringify(diff) : null, now)

    return c.json({ id, messageId: body.messageId, parentId: parent?.id ?? null, message: body.message, createdAt: now }, 201)
  })

  app.get('/', (c) => {
    const messageId = c.req.query('messageId')
    if (!messageId) return c.json({ error: 'messageId is required' }, 400)

    const rows = db
      .prepare('SELECT id, message_id, parent_id, message, created_at FROM versions WHERE message_id = ? ORDER BY created_at DESC')
      .all(messageId) as DbRow[]

    return c.json(rows.map((r) => ({
      id: r.id, messageId: r.message_id, parentId: r.parent_id,
      message: r.message, createdAt: r.created_at,
    })))
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(id) as DbRow | undefined
    if (!row) return c.json({ error: 'Version not found' }, 404)

    return c.json({
      id: row.id, messageId: row.message_id, parentId: row.parent_id,
      message: row.message, createdAt: row.created_at,
      snapshot: JSON.parse(row.snapshot as string),
      diff: row.diff ? JSON.parse(row.diff as string) : null,
    })
  })

  app.get('/:id/diff', (c) => {
    const { id } = c.req.param()
    const compareWith = c.req.query('compareWith')
    if (!compareWith) return c.json({ error: 'compareWith is required' }, 400)

    const vA = db.prepare('SELECT * FROM versions WHERE id = ?').get(id) as DbRow | undefined
    const vB = db.prepare('SELECT * FROM versions WHERE id = ?').get(compareWith) as DbRow | undefined
    if (!vA || !vB) return c.json({ error: 'Version not found' }, 404)

    const snapA = JSON.parse(vA.snapshot as string)
    const snapB = JSON.parse(vB.snapshot as string)
    const diff = jsondiffpatch.diff(snapA, snapB)

    return c.json({ versionA: vA.id, versionB: vB.id, diff })
  })

  app.post('/:id/rollback', async (c) => {
    const { id } = c.req.param()
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(id) as DbRow | undefined
    if (!row) return c.json({ error: 'Version not found' }, 404)

    const snapshot = JSON.parse(row.snapshot as string) as VersionSnapshot
    const messageId = row.message_id as string | null
    if (!messageId) return c.json({ error: 'Cannot rollback: no associated message' }, 400)

    const now = new Date().toISOString()

    db.prepare(
      `UPDATE messages SET name = ?, description = ?, frame_size = ?, byte_order = ?, updated_at = ? WHERE id = ?`
    ).run(snapshot.message.name, snapshot.message.description, snapshot.message.frameSize, snapshot.message.byteOrder, now, messageId)

    db.prepare('DELETE FROM signals WHERE message_id = ?').run(messageId)
    const insSignal = db.prepare(
      `INSERT INTO signals (id, message_id, name, description, start_bit, bit_length, byte_order,
         factor, offset, unit, minimum, maximum, value_table_id, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const s of snapshot.signals) {
      insSignal.run(s.id, s.messageId, s.name, s.description, s.startBit, s.bitLength, s.byteOrder,
        s.factor, s.offset, s.unit, s.minimum, s.maximum, s.valueTableId, s.color, s.sortOrder, s.createdAt, now)
    }

    const newId = randomUUID()
    const parent = db
      .prepare('SELECT id FROM versions WHERE message_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(messageId) as { id: string } | undefined

    const currentSnapshot = buildSnapshot(messageId)
    const diff = jsondiffpatch.diff(currentSnapshot, snapshot)

    db.prepare(
      `INSERT INTO versions (id, message_id, parent_id, message, snapshot, diff, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newId, messageId, parent?.id ?? null, `Rollback to: ${row.message}`, JSON.stringify(currentSnapshot), diff ? JSON.stringify(diff) : null, now)

    return c.json({ success: true, newVersionId: newId })
  })

  return app
}
