import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

interface DbRow { [key: string]: unknown }

function mapEntry(r: DbRow) {
  return {
    id: r.id, valueTableId: r.value_table_id,
    rawValue: r.raw_value, displayValue: r.display_value,
    description: r.description, sortOrder: r.sort_order,
  }
}

function mapTable(r: DbRow, entries: ReturnType<typeof mapEntry>[]) {
  return {
    id: r.id, name: r.name, description: r.description,
    entries, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export default function valueTableRoutes(db: Database.Database) {
  const app = new Hono()

  app.get('/', (c) => {
    const tables = db.prepare('SELECT * FROM value_tables ORDER BY name').all() as DbRow[]
    const result = tables.map((t) => {
      const entries = (db.prepare('SELECT * FROM value_table_entries WHERE value_table_id = ? ORDER BY sort_order, raw_value').all(t.id) as DbRow[]).map(mapEntry)
      return mapTable(t, entries)
    })
    return c.json(result)
  })

  app.get('/:id', (c) => {
    const { id } = c.req.param()
    const table = db.prepare('SELECT * FROM value_tables WHERE id = ?').get(id) as DbRow | undefined
    if (!table) return c.json({ error: 'Value table not found' }, 404)
    const entries = (db.prepare('SELECT * FROM value_table_entries WHERE value_table_id = ? ORDER BY sort_order, raw_value').all(id) as DbRow[]).map(mapEntry)
    return c.json(mapTable(table, entries))
  })

  app.post('/', async (c) => {
    const body = await c.req.json<{ name: string; description?: string; entries?: { rawValue: number; displayValue: string; description?: string; sortOrder?: number }[] }>()
    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`INSERT INTO value_tables (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, body.name, body.description ?? '', now, now)

    const entries: ReturnType<typeof mapEntry>[] = []
    if (body.entries) {
      const ins = db.prepare(
        `INSERT INTO value_table_entries (id, value_table_id, raw_value, display_value, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
      )
      for (let i = 0; i < body.entries.length; i++) {
        const e = body.entries[i]
        if (!e) continue
        const eid = randomUUID()
        ins.run(eid, id, e.rawValue, e.displayValue, e.description ?? '', e.sortOrder ?? i)
        entries.push({ id: eid, valueTableId: id, rawValue: e.rawValue, displayValue: e.displayValue, description: e.description ?? '', sortOrder: e.sortOrder ?? i })
      }
    }

    return c.json({ id, name: body.name, description: body.description ?? '', entries, createdAt: now, updatedAt: now }, 201)
  })

  app.put('/:id', async (c) => {
    const { id } = c.req.param()
    const body = await c.req.json<{ name?: string; description?: string; entries?: { rawValue: number; displayValue: string; description?: string; sortOrder?: number }[] }>()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT 1 FROM value_tables WHERE id = ?').get(id)
    if (!existing) return c.json({ error: 'Value table not found' }, 404)

    db.prepare(`UPDATE value_tables SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = ? WHERE id = ?`)
      .run(body.name ?? null, body.description ?? null, now, id)

    if (body.entries) {
      db.prepare('DELETE FROM value_table_entries WHERE value_table_id = ?').run(id)
      const ins = db.prepare(
        `INSERT INTO value_table_entries (id, value_table_id, raw_value, display_value, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
      )
      for (let i = 0; i < body.entries.length; i++) {
        const e = body.entries[i]
        if (!e) continue
        ins.run(randomUUID(), id, e.rawValue, e.displayValue, e.description ?? '', e.sortOrder ?? i)
      }
    }

    const table = db.prepare('SELECT * FROM value_tables WHERE id = ?').get(id) as DbRow
    const entries = (db.prepare('SELECT * FROM value_table_entries WHERE value_table_id = ? ORDER BY sort_order, raw_value').all(id) as DbRow[]).map(mapEntry)
    return c.json(mapTable(table, entries))
  })

  app.delete('/:id', (c) => {
    const { id } = c.req.param()
    const result = db.prepare('DELETE FROM value_tables WHERE id = ?').run(id)
    if (result.changes === 0) return c.json({ error: 'Value table not found' }, 404)
    return c.json({ success: true })
  })

  return app
}
