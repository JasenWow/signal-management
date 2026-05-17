import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core'

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  frameSize: integer('frame_size').notNull(),
  byteOrder: text('byte_order').notNull().default('big'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
})

export const valueTables = sqliteTable('value_tables', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
})

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  startBit: integer('start_bit').notNull(),
  bitLength: integer('bit_length').notNull(),
  byteOrder: text('byte_order').notNull().default('big'),
  factor: real('factor').notNull().default(1.0),
  offset: real('offset').notNull().default(0.0),
  unit: text('unit').notNull().default(''),
  minimum: real('minimum'),
  maximum: real('maximum'),
  valueTableId: text('value_table_id').references(() => valueTables.id, { onDelete: 'set null' }),
  dataType: text('data_type'),
  color: text('color').notNull().default('#10B981'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
}, (t) => [
  index('idx_signals_message').on(t.messageId),
  index('idx_signals_start_bit').on(t.messageId, t.startBit),
])

export const valueTableEntries = sqliteTable('value_table_entries', {
  id: text('id').primaryKey(),
  valueTableId: text('value_table_id').notNull().references(() => valueTables.id, { onDelete: 'cascade' }),
  rawValue: integer('raw_value').notNull(),
  displayValue: text('display_value').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('idx_vte_table').on(t.valueTableId),
])

export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  parentId: text('parent_id').references((): any => versions.id),
  message: text('message').notNull().default(''),
  snapshot: text('snapshot').notNull(),
  diff: text('diff'),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
}, (t) => [
  index('idx_versions_message').on(t.messageId),
  index('idx_versions_created').on(t.createdAt),
])

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6B7280'),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
})

export const signalTags = sqliteTable('signal_tags', {
  signalId: text('signal_id').notNull().references(() => signals.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.signalId, t.tagId] }),
  index('idx_signal_tags_signal').on(t.signalId),
  index('idx_signal_tags_tag').on(t.tagId),
])

export const messageTags = sqliteTable('message_tags', {
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.messageId, t.tagId] }),
  index('idx_message_tags_message').on(t.messageId),
  index('idx_message_tags_tag').on(t.tagId),
])
