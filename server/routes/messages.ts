import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { randomUUID } from 'crypto'
import { generateSignalId } from '../../src/foundation/lib/signal-id.js'
import type { CreateMessageInput, UpdateMessageInput } from '../../src/foundation/types.js'
import * as schema from '../db/schema.js'

const { messages, signals, tags, signalTags, messageTags } = schema

function getSignalTags(db: BunSQLiteDatabase<typeof schema>, signalId: string) {
  return db.select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(tags).innerJoin(signalTags, eq(tags.id, signalTags.tagId))
    .where(eq(signalTags.signalId, signalId)).all()
}

function getMessageTags(db: BunSQLiteDatabase<typeof schema>, messageId: string) {
  return db.select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(tags).innerJoin(messageTags, eq(tags.id, messageTags.tagId))
    .where(eq(messageTags.messageId, messageId)).all()
}

export default function messageRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.get('/', (c) => {
    const rows = db.select().from(messages).orderBy(messages.sortOrder, messages.createdAt).all()
    const messagesWithTags = rows.map((msg) => ({
      ...msg, tags: getMessageTags(db, msg.id),
    }))
    return c.json(messagesWithTags)
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const row = db.select().from(messages).where(eq(messages.id, id)).get()
    if (!row) return c.json({ error: 'Message not found' }, 404)

    const signalRows = db.select().from(signals).where(eq(signals.messageId, id)).orderBy(signals.startBit).all()
    const signalsWithTags = signalRows.map((s) => ({ ...s, tags: getSignalTags(db, s.id) }))
    return c.json({ ...row, signals: signalsWithTags, tags: getMessageTags(db, id) })
  })

  app.post('/', async (c) => {
    const body = await c.req.json<CreateMessageInput>()
    const id = randomUUID()
    const now = new Date().toISOString()

    db.insert(messages).values({
      id, name: body.name, description: body.description ?? '',
      frameSize: body.frameSize, byteOrder: body.byteOrder ?? 'big',
      createdAt: now, updatedAt: now,
    }).run()

    const row = db.select().from(messages).where(eq(messages.id, id)).get()
    return c.json(row, 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<UpdateMessageInput>()
    const now = new Date().toISOString()

    const existing = db.select().from(messages).where(eq(messages.id, id)).get()
    if (!existing) return c.json({ error: 'Message not found' }, 404)

    db.update(messages).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.frameSize !== undefined ? { frameSize: body.frameSize } : {}),
      ...(body.byteOrder !== undefined ? { byteOrder: body.byteOrder } : {}),
      updatedAt: now,
    }).where(eq(messages.id, id)).run()

    const row = db.select().from(messages).where(eq(messages.id, id)).get()
    return c.json(row)
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.delete(messages).where(eq(messages.id, id)).run()
    if (!result) return c.json({ error: 'Message not found' }, 404)
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
      signalGroups?: Array<{
        name: string; description?: string; startBit: number; bitWidth: number;
        isRepeating?: boolean; color?: string; sortOrder?: number;
        repeatCount?: number | null;
        signals?: Array<{
          name: string; description?: string; startBit: number; bitLength: number;
          byteOrder?: string; factor?: number; offset?: number; unit?: string;
          minimum?: number | null; maximum?: number | null; color?: string; sortOrder?: number;
        }>;
      }>;
    }>()

    const messageId = randomUUID()
    const now = new Date().toISOString()

    db.insert(messages).values({
      id: messageId, name: body.message.name, description: body.message.description ?? '',
      frameSize: body.message.frameSize, byteOrder: body.message.byteOrder ?? 'big',
      createdAt: now, updatedAt: now,
    }).run()

    try {
      db.transaction((tx) => {
        
        const conflictingSignals: string[] = []
        for (let i = 0; i < body.signals.length; i++) {
          const s = body.signals[i]
          let signalId: string
          try {
            signalId = generateSignalId(messageId, s.name, s.startBit, s.bitLength)
          } catch (err: any) {
            throw Object.assign(new Error(`Invalid signal "${s.name}": ${err.message}`), { status: 400 })
          }
          try {
            tx.insert(signals).values({
              id: signalId, messageId, name: s.name, description: s.description ?? '',
              startBit: s.startBit, bitLength: s.bitLength,
              byteOrder: s.byteOrder ?? 'big', factor: s.factor ?? 1.0,
              offset: s.offset ?? 0.0, unit: s.unit ?? '',
              minimum: s.minimum ?? null, maximum: s.maximum ?? null,
              valueTableId: null, dataType: null, color: s.color ?? '#10B981',
              sortOrder: s.sortOrder ?? i, createdAt: now, updatedAt: now,
            }).run()
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
    } catch (err: any) {
      if (err.status === 409) {
        return c.json({ error: err.message, conflictingSignals: err.conflictingSignals }, 409)
      }
      if (err.status === 400) {
        return c.json({ error: err.message }, 400)
      }
      return c.json({ error: err.message }, 500)
    }

    const row = db.select().from(messages).where(eq(messages.id, messageId)).get()
    const signalRows = db.select().from(signals).where(eq(signals.messageId, messageId)).orderBy(signals.startBit).all()
    return c.json({ ...row, signals: signalRows }, 201)
  })

  return app
}
