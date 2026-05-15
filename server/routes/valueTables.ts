import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { randomUUID } from 'crypto'
import * as schema from '../db/schema.js'

const { valueTables, valueTableEntries } = schema

export default function valueTableRoutes(db: BunSQLiteDatabase<typeof schema>) {
  const app = new Hono()

  app.get('/', (c) => {
    const tables = db.select().from(valueTables).orderBy(valueTables.name).all()
    const result = tables.map((t) => {
      const entries = db.select().from(valueTableEntries)
        .where(eq(valueTableEntries.valueTableId, t.id))
        .orderBy(valueTableEntries.sortOrder, valueTableEntries.rawValue).all()
      return { ...t, entries }
    })
    return c.json(result)
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const table = db.select().from(valueTables).where(eq(valueTables.id, id)).get()
    if (!table) return c.json({ error: 'Value table not found' }, 404)
    const entries = db.select().from(valueTableEntries)
      .where(eq(valueTableEntries.valueTableId, id))
      .orderBy(valueTableEntries.sortOrder, valueTableEntries.rawValue).all()
    return c.json({ ...table, entries })
  })

  app.post('/', async (c) => {
    const body = await c.req.json<{ name: string; description?: string; entries?: { rawValue: number; displayValue: string; description?: string; sortOrder?: number }[] }>()
    const id = randomUUID()
    const now = new Date().toISOString()

    db.insert(valueTables).values({ id, name: body.name, description: body.description ?? '', createdAt: now, updatedAt: now }).run()

    const entries: any[] = []
    if (body.entries) {
      for (let i = 0; i < body.entries.length; i++) {
        const e = body.entries[i]
        if (!e) continue
        const eid = randomUUID()
        const sortOrder = e.sortOrder ?? i
        db.insert(valueTableEntries).values({
          id: eid, valueTableId: id, rawValue: e.rawValue,
          displayValue: e.displayValue, description: e.description ?? '', sortOrder,
        }).run()
        entries.push({ id: eid, valueTableId: id, rawValue: e.rawValue, displayValue: e.displayValue, description: e.description ?? '', sortOrder })
      }
    }

    return c.json({ id, name: body.name, description: body.description ?? '', entries, createdAt: now, updatedAt: now }, 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<{ name?: string; description?: string; entries?: { rawValue: number; displayValue: string; description?: string; sortOrder?: number }[] }>()
    const now = new Date().toISOString()

    const existing = db.select().from(valueTables).where(eq(valueTables.id, id)).get()
    if (!existing) return c.json({ error: 'Value table not found' }, 404)

    db.update(valueTables).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      updatedAt: now,
    }).where(eq(valueTables.id, id)).run()

    if (body.entries) {
      db.delete(valueTableEntries).where(eq(valueTableEntries.valueTableId, id)).run()
      for (let i = 0; i < body.entries.length; i++) {
        const e = body.entries[i]
        if (!e) continue
        db.insert(valueTableEntries).values({
          id: randomUUID(), valueTableId: id, rawValue: e.rawValue,
          displayValue: e.displayValue, description: e.description ?? '', sortOrder: e.sortOrder ?? i,
        }).run()
      }
    }

    const table = db.select().from(valueTables).where(eq(valueTables.id, id)).get()
    const entries = db.select().from(valueTableEntries)
      .where(eq(valueTableEntries.valueTableId, id))
      .orderBy(valueTableEntries.sortOrder, valueTableEntries.rawValue).all()
    return c.json({ ...table, entries })
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.delete(valueTables).where(eq(valueTables.id, id)).run()
    if (result.changes === 0) return c.json({ error: 'Value table not found' }, 404)
    return c.json({ success: true })
  })

  return app
}
