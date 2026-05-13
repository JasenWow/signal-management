import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { CreateSignalInput, UpdateSignalInput } from '../../shared/types.js'

interface DbRow { [key: string]: unknown }

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

export default function signalRoutes(db: Database.Database) {
  const app = new Hono()

  app.post('/messages/:messageId/signals', async (c) => {
    const { messageId } = c.req.param()
    const body = await c.req.json<CreateSignalInput>()
    const id = randomUUID()
    const now = new Date().toISOString()

    const maxOrder = db
      .prepare('SELECT MAX(sort_order) as m FROM signals WHERE message_id = ?')
      .get(messageId) as { m: number | null }

    db.prepare(
      `INSERT INTO signals (id, message_id, name, description, start_bit, bit_length, byte_order,
         factor, offset, unit, minimum, maximum, value_table_id, data_type, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, messageId, body.name, body.description ?? '', body.startBit, body.bitLength,
      body.byteOrder ?? 'big', body.factor ?? 1.0, body.offset ?? 0.0, body.unit ?? '',
      body.minimum ?? null, body.maximum ?? null, body.valueTableId ?? null,
      body.dataType ?? null, body.color ?? '#10B981', (maxOrder?.m ?? -1) + 1, now, now
    )

    const row = db.prepare('SELECT * FROM signals WHERE id = ?').get(id) as DbRow
    return c.json(mapSignal(row), 201)
  })

  app.put('/signals/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateSignalInput>()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM signals WHERE id = ?').get(id) as DbRow | undefined
    if (!existing) return c.json({ error: 'Signal not found' }, 404)

    db.prepare(
      `UPDATE signals SET
         name = COALESCE(?, name), description = COALESCE(?, description),
         start_bit = COALESCE(?, start_bit), bit_length = COALESCE(?, bit_length),
         byte_order = COALESCE(?, byte_order), factor = COALESCE(?, factor),
         offset = COALESCE(?, offset), unit = COALESCE(?, unit),
         minimum = ?, maximum = ?,
         value_table_id = ?, data_type = ?, color = COALESCE(?, color),
         updated_at = ?
       WHERE id = ?`
    ).run(
      body.name ?? null, body.description ?? null,
      body.startBit ?? null, body.bitLength ?? null,
      body.byteOrder ?? null, body.factor ?? null,
      body.offset ?? null, body.unit ?? null,
      body.minimum !== undefined ? body.minimum : existing.minimum,
      body.maximum !== undefined ? body.maximum : existing.maximum,
      body.valueTableId !== undefined ? body.valueTableId : existing.value_table_id,
      body.dataType !== undefined ? body.dataType : existing.data_type,
      body.color ?? null, now, id
    )

    const row = db.prepare('SELECT * FROM signals WHERE id = ?').get(id) as DbRow
    return c.json(mapSignal(row))
  })

  app.delete('/signals/:id', (c) => {
    const { id } = c.req.param()
    const result = db.prepare('DELETE FROM signals WHERE id = ?').run(id)
    if (result.changes === 0) return c.json({ error: 'Signal not found' }, 404)
    return c.json({ success: true })
  })

  app.post('/signals/:id/validate', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<{ startBit?: number; bitLength?: number }>()

    const signal = db.prepare('SELECT * FROM signals WHERE id = ?').get(id) as DbRow | undefined
    if (!signal) return c.json({ error: 'Signal not found' }, 404)

    const startBit = body.startBit ?? signal.start_bit as number
    const bitLength = body.bitLength ?? signal.bit_length as number

    const conflicts = db.prepare(
      `SELECT id, name FROM signals
       WHERE message_id = ? AND start_bit < ? AND start_bit + bit_length > ? AND id != ?`
    ).all(signal.message_id, startBit + bitLength, startBit, id) as DbRow[]

    return c.json({
      hasOverlap: conflicts.length > 0,
      conflictingSignals: conflicts.map((r) => ({ id: r.id, name: r.name })),
    })
  })

  return app
}
