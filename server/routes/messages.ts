import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { CreateMessageInput, UpdateMessageInput } from '../../shared/types.js'

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

export default function messageRoutes(db: Database.Database) {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.prepare('SELECT * FROM messages ORDER BY sort_order, created_at DESC').all() as DbRow[]
    return c.json(rows.map(mapMessage))
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as DbRow | undefined
    if (!row) return c.json({ error: 'Message not found' }, 404)

    const signalRows = db.prepare('SELECT * FROM signals WHERE message_id = ? ORDER BY start_bit').all(id) as DbRow[]
    return c.json({ ...mapMessage(row), signals: signalRows.map(mapSignal) })
  })

  app.post('/', async (c) => {
    const body = await c.req.json<CreateMessageInput>()
    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO messages (id, name, description, frame_size, byte_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, body.name, body.description ?? '', body.frameSize, body.byteOrder ?? 'big', now, now)

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as DbRow
    return c.json(mapMessage(row), 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateMessageInput>()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT 1 FROM messages WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Message not found' }, 404)

    db.prepare(
      `UPDATE messages SET
         name = COALESCE(?, name), description = COALESCE(?, description),
         frame_size = COALESCE(?, frame_size), byte_order = COALESCE(?, byte_order),
         updated_at = ?
       WHERE id = ?`
    ).run(body.name ?? null, body.description ?? null, body.frameSize ?? null, body.byteOrder ?? null, now, id)

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as DbRow
    return c.json(mapMessage(row))
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.prepare('DELETE FROM messages WHERE id = ?').run(id)
    if (result.changes === 0) return c.json({ error: 'Message not found' }, 404)
    return c.json({ success: true })
  })

  return app
}
