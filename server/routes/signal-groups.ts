import { Hono } from 'hono'
import { eq, and, lt, gt, ne, sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { randomUUID } from 'crypto'
import type { CreateSignalGroupInput, UpdateSignalGroupInput } from '../../src/foundation/types.js'
import * as schema from '../db/schema.js'

const { messages, signalGroups } = schema

export default function signalGroupRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.get('/messages/:messageId/groups', (c) => {
    const { messageId } = c.req.param()
    const groups = db.select().from(signalGroups)
      .where(eq(signalGroups.messageId, messageId))
      .orderBy(signalGroups.sortOrder).all()
    return c.json(groups)
  })

  app.post('/messages/:messageId/groups', async (c) => {
    const { messageId } = c.req.param()
    const body = await c.req.json<CreateSignalGroupInput>()
    const msg = db.select().from(messages).where(eq(messages.id, messageId)).get()
    if (!msg) return c.json({ error: 'Message not found' }, 404)

    if (body.bitWidth < 1) {
      return c.json({ error: 'bitWidth must be at least 1' }, 400)
    }
    if (body.startBit + body.bitWidth > msg.frameSize * 8) {
      return c.json({ error: 'Group region exceeds frame size' }, 400)
    }

    // Check overlap with other groups
    const groupConflicts = db.select({ id: signalGroups.id, name: signalGroups.name })
      .from(signalGroups)
      .where(
        and(
          eq(signalGroups.messageId, messageId),
          lt(signalGroups.startBit, body.startBit + body.bitWidth),
          gt(sql`${signalGroups.startBit} + ${signalGroups.bitWidth}`, body.startBit),
        )
      ).all()

    if (groupConflicts.length > 0) {
      return c.json({
        error: 'Group region overlaps with existing groups',
        conflictingGroups: groupConflicts,
      }, 409)
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    const maxResult = db
      .select({ m: sql<number | null>`MAX(${signalGroups.sortOrder})` })
      .from(signalGroups)
      .where(eq(signalGroups.messageId, messageId))
      .get()
    const sortOrder = (maxResult?.m ?? -1) + 1

    db.insert(signalGroups).values({
      id, messageId, name: body.name, description: body.description ?? '',
      startBit: body.startBit, bitWidth: body.bitWidth,
      isRepeating: body.isRepeating ?? false,
      repeatCount: body.repeatCount ?? null,
      color: body.color ?? '#8B5CF6', sortOrder,
      createdAt: now, updatedAt: now,
    }).run()

    const group = db.select().from(signalGroups).where(eq(signalGroups.id, id)).get()
    return c.json(group, 201)
  })

  app.put('/groups/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateSignalGroupInput>()
    const now = new Date().toISOString()

    const existing = db.select().from(signalGroups).where(eq(signalGroups.id, id)).get()
    if (!existing) return c.json({ error: 'Group not found' }, 404)

    const startBit = body.startBit ?? existing.startBit
    const bitWidth = body.bitWidth ?? existing.bitWidth

    // Check overlap with other groups if region changed
    if (body.startBit !== undefined || body.bitWidth !== undefined) {
      const msg = db.select().from(messages).where(eq(messages.id, existing.messageId)).get()
      if (msg && startBit + bitWidth > msg.frameSize * 8) {
        return c.json({ error: 'Group region exceeds frame size' }, 400)
      }

      const groupConflicts = db.select({ id: signalGroups.id, name: signalGroups.name })
        .from(signalGroups)
        .where(
          and(
            eq(signalGroups.messageId, existing.messageId),
            ne(signalGroups.id, id),
            lt(signalGroups.startBit, startBit + bitWidth),
            gt(sql`${signalGroups.startBit} + ${signalGroups.bitWidth}`, startBit),
          )
        ).all()

      if (groupConflicts.length > 0) {
        return c.json({
          error: 'Group region overlaps with existing groups',
          conflictingGroups: groupConflicts,
        }, 409)
      }
    }

    db.update(signalGroups).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.startBit !== undefined ? { startBit: body.startBit } : {}),
      ...(body.bitWidth !== undefined ? { bitWidth: body.bitWidth } : {}),
      ...(body.isRepeating !== undefined ? { isRepeating: body.isRepeating } : {}),
      ...(body.repeatCount !== undefined ? { repeatCount: body.repeatCount } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      updatedAt: now,
    }).where(eq(signalGroups.id, id)).run()

    const group = db.select().from(signalGroups).where(eq(signalGroups.id, id)).get()
    return c.json(group)
  })

  app.delete('/groups/:id', (c) => {
    const { id } = c.req.param()
    const result = db.delete(signalGroups).where(eq(signalGroups.id, id)).run()
    if (result.changes === 0) return c.json({ error: 'Group not found' }, 404)
    return c.json({ success: true })
  })

  app.post('/groups/:id/validate', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<{ startBit?: number; bitWidth?: number }>()

    const group = db.select().from(signalGroups).where(eq(signalGroups.id, id)).get()
    if (!group) return c.json({ error: 'Group not found' }, 404)

    const startBit = body.startBit ?? group.startBit
    const bitWidth = body.bitWidth ?? group.bitWidth

    const groupConflicts = db.select({ id: signalGroups.id, name: signalGroups.name })
      .from(signalGroups)
      .where(
        and(
          eq(signalGroups.messageId, group.messageId),
          ne(signalGroups.id, id),
          lt(signalGroups.startBit, startBit + bitWidth),
          gt(sql`${signalGroups.startBit} + ${signalGroups.bitWidth}`, startBit),
        )
      ).all()

    return c.json({
      hasOverlap: groupConflicts.length > 0,
      conflictingGroups: groupConflicts,
    })
  })

  return app
}
