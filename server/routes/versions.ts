import { Hono } from 'hono'
import { eq, desc, sql, inArray } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { randomUUID } from 'crypto'
import * as jsondiffpatch from 'jsondiffpatch'
import type { VersionSnapshot } from '../../src/foundation/types.js'
import * as schema from '../db/schema.js'

const { messages, signals, valueTables, valueTableEntries, versions, tags, signalTags, messageTags } = schema

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

function buildSnapshot(db: BunSQLiteDatabase<typeof schema>, messageId: string): VersionSnapshot {
  const msgRow = db.select().from(messages).where(eq(messages.id, messageId)).get()!
  const signalRows = db.select().from(signals).where(eq(signals.messageId, messageId)).orderBy(signals.startBit).all()

  const valueTableIds = [...new Set(signalRows.map(s => s.valueTableId).filter(Boolean))] as string[]
  const vtList = valueTableIds.map(vtId => {
    const vt = db.select().from(valueTables).where(eq(valueTables.id, vtId!)).get()!
    const entries = db.select().from(valueTableEntries)
      .where(eq(valueTableEntries.valueTableId, vtId!))
      .orderBy(valueTableEntries.sortOrder, valueTableEntries.rawValue).all()
    return { ...vt, entries }
  })

  const mTags = getMessageTags(db, messageId)
  const sTags = signalRows.map(s => ({ signalId: s.id, tags: getSignalTags(db, s.id) }))

  return { message: msgRow, signals: signalRows, valueTables: vtList, messageTags: mTags, signalTags: sTags }
}

export default function versionRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.post('/', async (c) => {
    const body = await c.req.json<{ messageId: string; message: string }>()
    const id = randomUUID()
    const now = new Date().toISOString()

    const snapshot = buildSnapshot(db, body.messageId)

    const parent = db.select({ id: versions.id, snapshot: versions.snapshot })
      .from(versions)
      .where(eq(versions.messageId, body.messageId))
      .orderBy(desc(versions.createdAt)).limit(1).get()

    let diff: unknown = null
    if (parent) {
      const parentSnapshot = JSON.parse(parent.snapshot) as VersionSnapshot
      diff = jsondiffpatch.diff(parentSnapshot, snapshot)
    }

    db.insert(versions).values({
      id, messageId: body.messageId, parentId: parent?.id ?? null,
      message: body.message, snapshot: JSON.stringify(snapshot),
      diff: diff ? JSON.stringify(diff) : null, createdAt: now,
    }).run()

    return c.json({ id, messageId: body.messageId, parentId: parent?.id ?? null, message: body.message, createdAt: now }, 201)
  })

  app.get('/', (c) => {
    const messageId = c.req.query('messageId')
    if (!messageId) return c.json({ error: 'messageId is required' }, 400)

    const rows = db.select({
      id: versions.id, messageId: versions.messageId,
      parentId: versions.parentId, message: versions.message, createdAt: versions.createdAt,
    }).from(versions).where(eq(versions.messageId, messageId)).orderBy(desc(versions.createdAt)).all()

    return c.json(rows)
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const row = db.select().from(versions).where(eq(versions.id, id)).get()
    if (!row) return c.json({ error: 'Version not found' }, 404)

    return c.json({
      ...row,
      snapshot: JSON.parse(row.snapshot),
      diff: row.diff ? JSON.parse(row.diff) : null,
    })
  })

  app.get('/:id/diff', (c) => {
    const { id } = c.req.param()
    const compareWith = c.req.query('compareWith')
    if (!compareWith) return c.json({ error: 'compareWith is required' }, 400)

    const vA = db.select().from(versions).where(eq(versions.id, id)).get()
    const vB = db.select().from(versions).where(eq(versions.id, compareWith)).get()
    if (!vA || !vB) return c.json({ error: 'Version not found' }, 404)

    const snapA = JSON.parse(vA.snapshot)
    const snapB = JSON.parse(vB.snapshot)
    const diff = jsondiffpatch.diff(snapA, snapB)

    return c.json({ versionA: vA.id, versionB: vB.id, diff })
  })

  app.post('/:id/rollback', async (c) => {
    const { id } = c.req.param()
    const row = db.select().from(versions).where(eq(versions.id, id)).get()
    if (!row) return c.json({ error: 'Version not found' }, 404)

    const snapshot = JSON.parse(row.snapshot) as VersionSnapshot
    const messageId = row.messageId
    if (!messageId) return c.json({ error: 'Cannot rollback: no associated message' }, 400)

    const now = new Date().toISOString()

    db.update(messages).set({
      name: snapshot.message.name, description: snapshot.message.description,
      frameSize: snapshot.message.frameSize, byteOrder: snapshot.message.byteOrder,
      updatedAt: now,
    }).where(eq(messages.id, messageId)).run()

    db.delete(signals).where(eq(signals.messageId, messageId)).run()

    for (const s of snapshot.signals) {
      db.insert(signals).values({
        id: s.id, messageId, name: s.name, description: s.description,
        startBit: s.startBit, bitLength: s.bitLength, byteOrder: s.byteOrder,
        factor: s.factor, offset: s.offset, unit: s.unit,
        minimum: s.minimum, maximum: s.maximum, valueTableId: s.valueTableId,
        dataType: s.dataType ?? null, color: s.color, sortOrder: s.sortOrder,
        createdAt: s.createdAt, updatedAt: now,
      }).run()
    }

    // Restore signal tags
    const currentSignalIds = db.select({ id: signals.id }).from(signals).where(eq(signals.messageId, messageId)).all().map(r => r.id)
    if (currentSignalIds.length > 0) {
      db.delete(signalTags).where(inArray(signalTags.signalId, currentSignalIds)).run()
    }
    for (const st of snapshot.signalTags) {
      for (const tag of st.tags) {
        db.insert(tags).values({ id: tag.id, name: tag.name, color: tag.color, createdAt: tag.createdAt, updatedAt: tag.updatedAt })
          .onConflictDoNothing().run()
        db.insert(signalTags).values({ signalId: st.signalId, tagId: tag.id }).run()
      }
    }

    // Restore message tags
    db.delete(messageTags).where(eq(messageTags.messageId, messageId)).run()
    for (const tag of snapshot.messageTags) {
      db.insert(tags).values({ id: tag.id, name: tag.name, color: tag.color, createdAt: tag.createdAt, updatedAt: tag.updatedAt })
        .onConflictDoNothing().run()
      db.insert(messageTags).values({ messageId, tagId: tag.id }).run()
    }

    const newId = randomUUID()
    const parent = db.select({ id: versions.id })
      .from(versions).where(eq(versions.messageId, messageId))
      .orderBy(desc(versions.createdAt)).limit(1).get()

    const currentSnapshot = buildSnapshot(db, messageId)
    const diff = jsondiffpatch.diff(currentSnapshot, snapshot)

    db.insert(versions).values({
      id: newId, messageId, parentId: parent?.id ?? null,
      message: `Rollback to: ${row.message}`, snapshot: JSON.stringify(currentSnapshot),
      diff: diff ? JSON.stringify(diff) : null, createdAt: now,
    }).run()

    return c.json({ success: true, newVersionId: newId })
  })

  return app
}
