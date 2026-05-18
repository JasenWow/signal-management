import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema.js'

const { tags, signalTags, messageTags } = schema

export function getSignalTags(db: BunSQLiteDatabase<typeof schema>, signalId: string) {
  return db.select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(tags).innerJoin(signalTags, eq(tags.id, signalTags.tagId))
    .where(eq(signalTags.signalId, signalId)).all()
}

export function getMessageTags(db: BunSQLiteDatabase<typeof schema>, messageId: string) {
  return db.select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(tags).innerJoin(messageTags, eq(tags.id, messageTags.tagId))
    .where(eq(messageTags.messageId, messageId)).all()
}
