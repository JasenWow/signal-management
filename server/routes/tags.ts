import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { randomUUID } from 'crypto'
import type { CreateTagInput, UpdateTagInput } from '../../src/foundation/types.js'
import { DEFAULT_TAG_COLORS } from '../../src/foundation/lib/constants.js'
import * as schema from '../db/schema.js'

const { tags, signals, signalTags, messageTags, messages } = schema

export default function tagRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.select().from(tags).orderBy(tags.name).all()
    return c.json(rows)
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
      db.insert(tags).values({ id, name: body.name.trim(), color, createdAt: now, updatedAt: now }).run()
    } catch {
      return c.json({ error: 'Tag name already exists' }, 409)
    }

    const tag = db.select().from(tags).where(eq(tags.id, id)).get()
    return c.json(tag, 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateTagInput>()
    const now = new Date().toISOString()

    const existing = db.select().from(tags).where(eq(tags.id, id)).get()
    if (!existing) return c.json({ error: 'Tag not found' }, 404)

    db.update(tags).set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      updatedAt: now,
    }).where(eq(tags.id, id)).run()

    const tag = db.select().from(tags).where(eq(tags.id, id)).get()
    return c.json(tag)
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.delete(tags).where(eq(tags.id, id)).run()
    if (result.changes === 0) return c.json({ error: 'Tag not found' }, 404)
    return c.json({ success: true })
  })

  app.post('/signals/:signalId/tags', async (c) => {
    const { signalId } = c.req.param()
    const body = await c.req.json<{ tagIds: string[] }>()

    const signal = db.select({ id: signals.id }).from(signals).where(eq(signals.id, signalId)).get()
    if (!signal) return c.json({ error: 'Signal not found' }, 404)

    for (const tagId of body.tagIds ?? []) {
      db.insert(signalTags).values({ signalId, tagId }).onConflictDoNothing().run()
    }

    return c.json({ success: true })
  })

  app.delete('/signals/:signalId/tags/:tagId', (c) => {
    const { signalId, tagId } = c.req.param()
    db.delete(signalTags).where(and(eq(signalTags.signalId, signalId), eq(signalTags.tagId, tagId))).run()
    return c.json({ success: true })
  })

  app.post('/messages/:messageId/tags', async (c) => {
    const { messageId } = c.req.param()
    const body = await c.req.json<{ tagIds: string[] }>()

    const message = db.select({ id: messages.id }).from(messages).where(eq(messages.id, messageId)).get()
    if (!message) return c.json({ error: 'Message not found' }, 404)

    for (const tagId of body.tagIds ?? []) {
      db.insert(messageTags).values({ messageId, tagId }).onConflictDoNothing().run()
    }

    return c.json({ success: true })
  })

  app.delete('/messages/:messageId/tags/:tagId', (c) => {
    const { messageId, tagId } = c.req.param()
    db.delete(messageTags).where(and(eq(messageTags.messageId, messageId), eq(messageTags.tagId, tagId))).run()
    return c.json({ success: true })
  })

  app.get('/signals', (c) => {
    const tagId = c.req.query('tagId')
    if (!tagId) return c.json({ error: 'tagId query required' }, 400)

    const rows = db.select()
      .from(signals)
      .innerJoin(signalTags, eq(signals.id, signalTags.signalId))
      .where(eq(signalTags.tagId, tagId)).all()

    return c.json(rows.map(r => r.signals))
  })

  app.get('/messages', (c) => {
    const tagId = c.req.query('tagId')
    if (!tagId) return c.json({ error: 'tagId query required' }, 400)

    const rows = db.select()
      .from(messages)
      .innerJoin(messageTags, eq(messages.id, messageTags.messageId))
      .where(eq(messageTags.tagId, tagId)).all()

    return c.json(rows.map(r => r.messages))
  })

  return app
}
