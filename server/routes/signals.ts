import { Hono } from 'hono'
import { eq, and, lt, gt, ne, sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { generateSignalId } from '../../src/foundation/lib/signal-id.js'
import type { CreateSignalInput, UpdateSignalInput } from '../../src/foundation/types.js'
import * as schema from '../db/schema.js'

const { signals, signalGroups } = schema

export default function signalRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.post('/messages/:messageId/signals', async (c) => {
    const { messageId } = c.req.param()
    const body = await c.req.json<CreateSignalInput>()
    let id: string
    try {
      id = generateSignalId(messageId, body.name, body.startBit, body.bitLength)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
    const now = new Date().toISOString()

    const maxResult = db
      .select({ m: sql<number | null>`MAX(${signals.sortOrder})` })
      .from(signals)
      .where(eq(signals.messageId, messageId))
      .get()

    const sortOrder = (maxResult?.m ?? -1) + 1

    // If groupId provided, validate it exists in this message
    let groupId: string | null = body.groupId ?? null
    if (groupId) {
      const group = db.select().from(signalGroups).where(eq(signalGroups.id, groupId)).get()
      if (!group || group.messageId !== messageId) {
        return c.json({ error: 'Group not found in this message' }, 400)
      }
    }

    // Check signal-vs-group-repeat-cycle conflicts
    const signalRangeEnd = body.startBit + body.bitLength
    const candidateGroups = db.select({
      id: signalGroups.id,
      name: signalGroups.name,
      startBit: signalGroups.startBit,
      bitWidth: signalGroups.bitWidth,
      repeatCount: signalGroups.repeatCount,
    })
      .from(signalGroups)
      .where(
        and(
          eq(signalGroups.messageId, messageId),
          lt(signalGroups.startBit, signalRangeEnd + signalGroups.bitWidth),
          gt(sql`${signalGroups.startBit} + ${signalGroups.bitWidth} * coalesce(${signalGroups.repeatCount}, 1)`, body.startBit),
        )
      ).all()

    const newSignalRange = { start: body.startBit, end: signalRangeEnd }
    const groupConflicts = candidateGroups.filter(candidate => {
      const candRepeatCount = candidate.repeatCount ?? 1
      const candRange = {
        start: candidate.startBit,
        end: candidate.startBit + candidate.bitWidth * candRepeatCount,
      }
      return newSignalRange.start < candRange.end && candRange.start < newSignalRange.end
    })

    if (groupConflicts.length > 0) {
      return c.json({
        error: 'Signal overlaps with existing group repeat cycles',
        conflictingGroups: groupConflicts.map(g => ({ id: g.id, name: g.name })),
      }, 409)
    }

    try {
      db.insert(signals).values({
        id, messageId, name: body.name, description: body.description ?? '',
        startBit: body.startBit, bitLength: body.bitLength,
        byteOrder: body.byteOrder ?? 'big', factor: body.factor ?? 1.0,
        offset: body.offset ?? 0.0, unit: body.unit ?? '',
        minimum: body.minimum ?? null, maximum: body.maximum ?? null,
        valueTableId: body.valueTableId ?? null, dataType: body.dataType ?? null,
        color: body.color ?? '#10B981', groupId, sortOrder, createdAt: now, updatedAt: now,
      }).run()
    } catch (err: any) {
      if (err.message.includes('UNIQUE') || err.message.includes('SQLITE_CONSTRAINT')) {
        return c.json({ error: 'Signal already exists with the same name, startBit and bitLength in this message' }, 409)
      }
      throw err
    }

    const signal = db.select().from(signals).where(eq(signals.id, id)).get()
    return c.json(signal, 201)
  })

  app.put('/signals/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateSignalInput>()
    const now = new Date().toISOString()

    const existing = db.select().from(signals).where(eq(signals.id, id)).get()
    if (!existing) return c.json({ error: 'Signal not found' }, 404)

    // If changing groupId, validate the new group exists in this message
    if (body.groupId !== undefined && body.groupId !== existing.groupId && body.groupId) {
      const group = db.select().from(signalGroups).where(eq(signalGroups.id, body.groupId)).get()
      if (!group || group.messageId !== existing.messageId) {
        return c.json({ error: 'Group not found in this message' }, 400)
      }
    }

    db.update(signals).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.startBit !== undefined ? { startBit: body.startBit } : {}),
      ...(body.bitLength !== undefined ? { bitLength: body.bitLength } : {}),
      ...(body.byteOrder !== undefined ? { byteOrder: body.byteOrder } : {}),
      ...(body.factor !== undefined ? { factor: body.factor } : {}),
      ...(body.offset !== undefined ? { offset: body.offset } : {}),
      ...(body.unit !== undefined ? { unit: body.unit } : {}),
      minimum: body.minimum !== undefined ? body.minimum : existing.minimum,
      maximum: body.maximum !== undefined ? body.maximum : existing.maximum,
      valueTableId: body.valueTableId !== undefined ? body.valueTableId : existing.valueTableId,
      dataType: body.dataType !== undefined ? body.dataType : existing.dataType,
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.groupId !== undefined ? { groupId: body.groupId } : {}),
      updatedAt: now,
    }).where(eq(signals.id, id)).run()

    const signal = db.select().from(signals).where(eq(signals.id, id)).get()
    return c.json(signal)
  })

  app.delete('/signals/:id', (c) => {
    const { id } = c.req.param()
    const result = db.delete(signals).where(eq(signals.id, id)).run()
    if (result.changes === 0) return c.json({ error: 'Signal not found' }, 404)
    return c.json({ success: true })
  })

  app.post('/signals/:id/validate', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<{ startBit?: number; bitLength?: number }>()

    const signal = db.select().from(signals).where(eq(signals.id, id)).get()
    if (!signal) return c.json({ error: 'Signal not found' }, 404)

    const startBit = body.startBit ?? signal.startBit
    const bitLength = body.bitLength ?? signal.bitLength

    const conflicts = db.select({ id: signals.id, name: signals.name })
      .from(signals)
      .where(
        and(
          eq(signals.messageId, signal.messageId),
          lt(signals.startBit, startBit + bitLength),
          gt(sql`${signals.startBit} + ${signals.bitLength}`, startBit),
          ne(signals.id, id),
        )
      ).all()

    return c.json({
      hasOverlap: conflicts.length > 0,
      conflictingSignals: conflicts,
    })
  })

  return app
}
