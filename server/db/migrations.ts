import type { Database } from 'bun:sqlite'
import { SCHEMA_DDL } from './schema.js'

interface Migration {
  name: string
  up: string
}

const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    up: SCHEMA_DDL,
  },
  {
    name: '002_tags_and_data_type',
    up: `ALTER TABLE signals ADD COLUMN data_type TEXT DEFAULT NULL;`,
  },
]

export function runMigrations(db: Database): void {
  db.exec(SCHEMA_DDL)

  const insert = db.prepare(
    'INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, datetime(\'now\'))'
  )

  for (const migration of migrations) {
    const row = db
      .prepare('SELECT 1 FROM _migrations WHERE name = ?')
      .get(migration.name)
    if (!row) {
      db.exec(migration.up)
      insert.run(migration.name)
    }
  }
}
