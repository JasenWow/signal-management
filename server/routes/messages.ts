import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { generateSignalId } from '../../src/foundation/lib/signal-id.js'
import type { CreateMessageInput, UpdateMessageInput, Message, Signal, Tag } from '../../src/foundation/types.js'

interface DbRow { [key: string]: unknown }

function mapMessage(r: DbRow): Message {
  return {
    id: r.id as string, name: r.name as string, description: r.description as string,
    frameSize: r.frame_size as number, byteOrder: r.byte_order as Message['byteOrder'],
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }
}

function mapTag(r: DbRow): Tag {
  return { id: r.id as string, name: r.name as string, color: r.color as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string }
}

function getSignalTags(db: Database.Database, signalId: string): Tag[] {
  return (db.prepare(
    `SELECT t.id, t.name, t.color, t.created_at, t.updated_at
     FROM tags t JOIN signal_tags st ON t.id = st.tag_id
     WHERE st.signal_id = ?`
  ).all(signalId) as DbRow[]).map(mapTag)
}

function getMessageTags(db: Database.Database, messageId: string): Tag[] {
  return (db.prepare(
    `SELECT t.id, t.name, t.color, t.created_at, t.updated_at
     FROM tags t JOIN message_tags mt ON t.id = mt.tag_id
     WHERE mt.message_id = ?`
  ).all(messageId) as DbRow[]).map(mapTag)
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

export default function messageRoutes(db: Database.Database) {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.prepare('SELECT * FROM messages ORDER BY sort_order, created_at DESC').all() as DbRow[]
    const messagesWithTags = rows.map((r) => {
      const msg = mapMessage(r)
      return { ...msg, tags: getMessageTags(db, msg.id) }
    })
    return c.json(messagesWithTags)
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as DbRow | undefined
    if (!row) return c.json({ error: 'Message not found' }, 404)

    const signalRows = db.prepare('SELECT * FROM signals WHERE message_id = ? ORDER BY start_bit').all(id) as DbRow[]
    const signalsWithTags = signalRows.map((r) => {
      const signal = mapSignal(r)
      return { ...signal, tags: getSignalTags(db, signal.id) }
    })
    return c.json({ ...mapMessage(row), signals: signalsWithTags, tags: getMessageTags(db, id) })
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

  app.post('/import', async (c) => {
    const body = await c.req.json<{
      message: { name: string; description?: string; frameSize: number; byteOrder?: string };
      signals: Array<{
        name: string; description?: string; startBit: number; bitLength: number;
        byteOrder?: string; factor?: number; offset?: number; unit?: string;
        minimum?: number | null; maximum?: number | null; color?: string; sortOrder?: number;
      }>;
    }>()

    const messageId = randomUUID()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO messages (id, name, description, frame_size, byte_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(messageId, body.message.name, body.message.description ?? '', body.message.frameSize, body.message.byteOrder ?? 'big', now, now)

    const signalInsert = db.prepare(
      `INSERT INTO signals (id, message_id, name, description, start_bit, bit_length, byte_order,
         factor, offset, unit, minimum, maximum, value_table_id, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const insertSignals = db.transaction((signals: typeof body.signals) => {
      const conflictingSignals: string[] = []
      for (let i = 0; i < signals.length; i++) {
        const s = signals[i]
        let signalId: string
        try {
          signalId = generateSignalId(messageId, s.name, s.startBit, s.bitLength)
        } catch (err: any) {
          throw Object.assign(new Error(`Invalid signal "${s.name}": ${err.message}`), { status: 400 })
        }
        try {
          signalInsert.run(
            signalId, messageId, s.name, s.description ?? '', s.startBit, s.bitLength,
            s.byteOrder ?? 'big', s.factor ?? 1.0, s.offset ?? 0.0, s.unit ?? '',
            s.minimum ?? null, s.maximum ?? null, null,
            s.color ?? '#10B981', s.sortOrder ?? i, now, now
          )
        } catch (err: any) {
          if (err.message.includes('UNIQUE') || err.message.includes('SQLITE_CONSTRAINT')) {
            conflictingSignals.push(s.name)
          }
          throw err
        }
      }
      if (conflictingSignals.length > 0) {
        throw Object.assign(
          new Error(`Signal(s) ${conflictingSignals.map(n => `"${n}"`).join(', ')} already exist in this message`),
          { conflictingSignals, status: 409 }
        )
      }
    })

    try {
      insertSignals(body.signals)
    } catch (err: any) {
      if (err.status === 409) {
        return c.json({ error: err.message, conflictingSignals: err.conflictingSignals }, 409)
      }
      if (err.status === 400) {
        return c.json({ error: err.message }, 400)
      }
      return c.json({ error: err.message }, 500)
    }

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as DbRow
    const signalRows = db.prepare('SELECT * FROM signals WHERE message_id = ? ORDER BY start_bit').all(messageId) as DbRow[]
    return c.json({ ...mapMessage(row), signals: signalRows.map(mapSignal) }, 201)
  })

  return app
}
