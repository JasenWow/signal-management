import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { initDb } from './db/connection.js'
import { runMigrations } from './db/migrations.js'
import messageRoutes from './routes/messages.js'
import signalRoutes from './routes/signals.js'
import valueTableRoutes from './routes/valueTables.js'
import versionRoutes from './routes/versions.js'

const app = new Hono()

app.use('/*', cors())
app.get('/api/health', (c) => c.json({ status: 'ok' }))

const db = initDb('./data/signal-mgmt.db')
runMigrations(db)

app.route('/api/messages', messageRoutes(db))
app.route('/api', signalRoutes(db))
app.route('/api/value-tables', valueTableRoutes(db))
app.route('/api/versions', versionRoutes(db))

const port = 3001
serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})
