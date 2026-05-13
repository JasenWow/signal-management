import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { CreateTagInput, UpdateTagInput } from '../../shared/types.js'
import { DEFAULT_TAG_COLORS } from '../../shared/constants.js'

interface DbRow { [key: string]: unknown }

function mapTag(r: DbRow) {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export default function tagRoutes(db: Database.Database) {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.prepare('SELECT * FROM tags ORDER BY name').all() as DbRow[]
    return c.json(rows.map(mapTag))
  })

  app.post('/', async (c) => {
    const body = await c.req.json<CreateTagInput>()
    if (!body.name?.trim()) {
      return c.json({ error: 'Tag name is required' }, 400)
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    const color = body.color ?? DEFAULT_TAG_COLORS[0]

    try {
      db.prepare(
        `INSERT INTO tags (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      ).run(id, body.name.trim(), color, now, now)
    } catch {
      return c.json({ error: 'Tag name already exists' }, 409)
    }

    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as DbRow
    return c.json(mapTag(row), 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateTagInput>()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as DbRow | undefined
    if (!existing) return c.json({ error: 'Tag not found' }, 404)

    db.prepare(
      `UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color), updated_at = ? WHERE id = ?`
    ).run(body.name?.trim() ?? null, body.color ?? null, now, id)

    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as DbRow
    return c.json(mapTag(row))
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    if (result.changes === 0) return c.json({ error: 'Tag not found' }, 404)
    return c.json({ success: true })
  })

  app.post('/signals/:signalId/tags', async (c) => {
    const { signalId } = c.req.param()
    const body = await c.req.json<{ tagIds: string[] }>()

    const signal = db.prepare('SELECT id FROM signals WHERE id = ?').get(signalId)
    if (!signal) return c.json({ error: 'Signal not found' }, 404)

    const insert = db.prepare('INSERT OR IGNORE INTO signal_tags (signal_id, tag_id) VALUES (?, ?)')
    for (const tagId of body.tagIds ?? []) {
      insert.run(signalId, tagId)
    }

    return c.json({ success: true })
  })

  app.delete('/signals/:signalId/tags/:tagId', (c) => {
    const { signalId, tagId } = c.req.param()
    db.prepare('DELETE FROM signal_tags WHERE signal_id = ? AND tag_id = ?').run(signalId, tagId)
    return c.json({ success: true })
  })

  app.post('/messages/:messageId/tags', async (c) => {
    const { messageId } = c.req.param()
    const body = await c.req.json<{ tagIds: string[] }>()

    const message = db.prepare('SELECT id FROM messages WHERE id = ?').get(messageId)
    if (!message) return c.json({ error: 'Message not found' }, 404)

    const insert = db.prepare('INSERT OR IGNORE INTO message_tags (message_id, tag_id) VALUES (?, ?)')
    for (const tagId of body.tagIds ?? []) {
      insert.run(messageId, tagId)
    }

    return c.json({ success: true })
  })

  app.delete('/messages/:messageId/tags/:tagId', (c) => {
    const { messageId, tagId } = c.req.param()
    db.prepare('DELETE FROM message_tags WHERE message_id = ? AND tag_id = ?').run(messageId, tagId)
    return c.json({ success: true })
  })

  app.get('/signals', (c) => {
    const tagId = c.req.query('tagId')
    if (!tagId) return c.json({ error: 'tagId query required' }, 400)

    const rows = db.prepare(
      `SELECT s.* FROM signals s
       JOIN signal_tags st ON s.id = st.signal_id
       WHERE st.tag_id = ?`
    ).all(tagId) as DbRow[]

    return c.json(rows.map(mapSignal))
  })

  app.get('/messages', (c) => {
    const tagId = c.req.query('tagId')
    if (!tagId) return c.json({ error: 'tagId query required' }, 400)

    const rows = db.prepare(
      `SELECT m.* FROM messages m
       JOIN message_tags mt ON m.id = mt.message_id
       WHERE mt.tag_id = ?`
    ).all(tagId) as DbRow[]

    return c.json(rows.map(mapMessage))
  })

  return app
}

function mapSignal(r: DbRow) {
  return {
    id: r.id, messageId: r.message_id, name: r.name, description: r.description,
    startBit: r.start_bit, bitLength: r.bit_length, byteOrder: r.byte_order,
    factor: r.factor, offset: r.offset, unit: r.unit,
    minimum: r.minimum, maximum: r.maximum, valueTableId: r.value_table_id,
    dataType: r.data_type, color: r.color, sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

function mapMessage(r: DbRow) {
  return {
    id: r.id, name: r.name, description: r.description,
    frameSize: r.frame_size, byteOrder: r.byte_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}