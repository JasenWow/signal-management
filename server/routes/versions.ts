import { Hono } from 'hono'
import type { Database } from 'bun:sqlite'
import { randomUUID } from 'crypto'
import * as jsondiffpatch from 'jsondiffpatch'
import type { VersionSnapshot, Message, Signal, Tag, ValueTable, ValueTableEntry } from '../../src/foundation/types.js'

interface DbRow { [key: string]: unknown }

function mapMessage(r: DbRow): Message {
  return {
    id: r.id as string, name: r.name as string, description: r.description as string,
    frameSize: r.frame_size as number, byteOrder: r.byte_order as Message['byteOrder'],
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }
}

function mapSignal(r: DbRow): Signal {
  return {
    id: r.id as string, messageId: r.message_id as string, name: r.name as string, description: r.description as string,
    startBit: r.start_bit as number, bitLength: r.bit_length as number, byteOrder: r.byte_order as Signal['byteOrder'],
    factor: r.factor as number, offset: r.offset as number, unit: r.unit as string,
    minimum: r.minimum as number | null, maximum: r.maximum as number | null, valueTableId: r.value_table_id as string | null,
    dataType: r.data_type as Signal['dataType'], color: r.color as string, sortOrder: r.sort_order as number,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }
}

function mapEntry(r: DbRow): ValueTableEntry {
  return {
    id: r.id as string, valueTableId: r.value_table_id as string,
    rawValue: r.raw_value as number, displayValue: r.display_value as string,
    description: r.description as string, sortOrder: r.sort_order as number,
  }
}

function mapValueTable(vt: DbRow, entries: ValueTableEntry[]): ValueTable {
  return {
    id: vt.id as string, name: vt.name as string, description: vt.description as string,
    entries, createdAt: vt.created_at as string, updatedAt: vt.updated_at as string,
  }
}

function mapTag(r: DbRow): Tag {
  return { id: r.id as string, name: r.name as string, color: r.color as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string }
}

function getMessageTags(db: Database, messageId: string) {
  return (db.prepare(
    `SELECT t.id, t.name, t.color, t.created_at, t.updated_at
     FROM tags t JOIN message_tags mt ON t.id = mt.tag_id
     WHERE mt.message_id = ?`
  ).all(messageId) as DbRow[]).map(mapTag)
}

function getSignalTags(db: Database, signalId: string) {
  return (db.prepare(
    `SELECT t.id, t.name, t.color, t.created_at, t.updated_at
     FROM tags t JOIN signal_tags st ON t.id = st.tag_id
     WHERE st.signal_id = ?`
  ).all(signalId) as DbRow[]).map(mapTag)
}

export default function versionRoutes(db: Database) {
  const app = new Hono()

  function buildSnapshot(messageId: string): VersionSnapshot {
    const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as DbRow
    const signalRows = db.prepare('SELECT * FROM signals WHERE message_id = ? ORDER BY start_bit').all(messageId) as DbRow[]

    const signals = signalRows.map(mapSignal)
    const valueTableIds = [...new Set(signals.map((s) => s.valueTableId).filter(Boolean))] as string[]
    const valueTables = valueTableIds.map((vtId) => {
      const vt = db.prepare('SELECT * FROM value_tables WHERE id = ?').get(vtId) as DbRow
      const entries = (db.prepare('SELECT * FROM value_table_entries WHERE value_table_id = ? ORDER BY sort_order, raw_value').all(vtId) as DbRow[]).map(mapEntry)
      return mapValueTable(vt, entries)
    })

    const messageTags = getMessageTags(db, messageId)
    const signalTags = signals.map((s) => ({ signalId: s.id, tags: getSignalTags(db, s.id) }))

    return { message: mapMessage(msgRow), signals, valueTables, messageTags, signalTags }
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
         factor, offset, unit, minimum, maximum, value_table_id, data_type, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const s of snapshot.signals) {
      insSignal.run(s.id, s.messageId, s.name, s.description, s.startBit, s.bitLength, s.byteOrder,
        s.factor, s.offset, s.unit, s.minimum, s.maximum, s.valueTableId, s.dataType ?? null, s.color, s.sortOrder, s.createdAt, now)
    }

    // Restore signal tags
    db.prepare('DELETE FROM signal_tags WHERE signal_id IN (SELECT id FROM signals WHERE message_id = ?)').run(messageId)
    const insSignalTag = db.prepare('INSERT OR IGNORE INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    const insSignalTagLink = db.prepare('INSERT INTO signal_tags (signal_id, tag_id) VALUES (?, ?)')
    for (const st of snapshot.signalTags) {
      for (const tag of st.tags) {
        insSignalTag.run(tag.id, tag.name, tag.color, tag.createdAt, tag.updatedAt)
        insSignalTagLink.run(st.signalId, tag.id)
      }
    }

    // Restore message tags
    db.prepare('DELETE FROM message_tags WHERE message_id = ?').run(messageId)
    const insMessageTag = db.prepare('INSERT OR IGNORE INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    const insMessageTagLink = db.prepare('INSERT INTO message_tags (message_id, tag_id) VALUES (?, ?)')
    for (const tag of snapshot.messageTags) {
      insMessageTag.run(tag.id, tag.name, tag.color, tag.createdAt, tag.updatedAt)
      insMessageTagLink.run(messageId, tag.id)
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
