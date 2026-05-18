import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFileSync } from 'fs'
import { initDb } from './db/connection.js'
import { runMigrations } from './db/migrations.js'
import messageRoutes from './routes/messages.js'
import signalRoutes from './routes/signals.js'

import valueTableRoutes from './routes/valueTables.js'
import versionRoutes from './routes/versions.js'
import tagRoutes from './routes/tags.js'

const app = new Hono()

app.use('/*', cors())
app.get('/api/health', (c) => c.json({ status: 'ok' }))

const { db, sqlite } = initDb('./data/signal-mgmt.db')
runMigrations(db, sqlite)

app.route('/api/messages', messageRoutes(db))
app.route('/api', signalRoutes(db))

app.route('/api/value-tables', valueTableRoutes(db))
app.route('/api/versions', versionRoutes(db))
app.route('/api/tags', tagRoutes(db))

// Serve static assets from dist/
app.get('/assets/*', serveStatic({ root: './dist/' }))

// Cache index.html at startup for SPA fallback
let indexHtml: string | null = null
try {
  indexHtml = readFileSync('./dist/index.html', 'utf-8')
} catch {
  // dist/index.html may not exist during early development
}

// SPA fallback: all non-API GET requests serve index.html
app.get('*', (c) => {
  if (c.req.path.startsWith('/api')) return c.notFound()
  if (!indexHtml) return c.notFound()
  return c.html(indexHtml)
})

const port = 3002
serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})
