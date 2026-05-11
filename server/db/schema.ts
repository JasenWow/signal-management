export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS _migrations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  frame_size  INTEGER NOT NULL,
  byte_order  TEXT NOT NULL DEFAULT 'big',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS signals (
  id              TEXT PRIMARY KEY,
  message_id      TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  start_bit       INTEGER NOT NULL,
  bit_length      INTEGER NOT NULL,
  byte_order      TEXT NOT NULL DEFAULT 'big',
  factor          REAL NOT NULL DEFAULT 1.0,
  offset          REAL NOT NULL DEFAULT 0.0,
  unit            TEXT NOT NULL DEFAULT '',
  minimum         REAL,
  maximum         REAL,
  value_table_id  TEXT REFERENCES value_tables(id) ON DELETE SET NULL,
  color           TEXT NOT NULL DEFAULT '#10B981',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS value_tables (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS value_table_entries (
  id              TEXT PRIMARY KEY,
  value_table_id  TEXT NOT NULL REFERENCES value_tables(id) ON DELETE CASCADE,
  raw_value       INTEGER NOT NULL,
  display_value   TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS versions (
  id          TEXT PRIMARY KEY,
  message_id  TEXT REFERENCES messages(id) ON DELETE SET NULL,
  parent_id   TEXT REFERENCES versions(id),
  message     TEXT NOT NULL DEFAULT '',
  snapshot    TEXT NOT NULL,
  diff        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_signals_message ON signals(message_id);
CREATE INDEX IF NOT EXISTS idx_signals_start_bit ON signals(message_id, start_bit);
CREATE INDEX IF NOT EXISTS idx_versions_message ON versions(message_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON versions(created_at);
CREATE INDEX IF NOT EXISTS idx_vte_table ON value_table_entries(value_table_id);
`
