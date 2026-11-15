import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { resolve } from 'node:path'

/**
 * Local development only: serves the Vercel functions in /api through Vite,
 * so `npm run dev` works without the Vercel CLI. On Vercel, /api is handled natively.
 */
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // Slow / high-latency networks: Node's default 250ms per-address connect attempt
      // can time out when reaching Neon. Give each attempt more time (dev only).
      net.setDefaultAutoSelectFamilyAttemptTimeout(3000)

      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const name = url.pathname.replace(/^\/+|\/+$/g, '')
        const file = resolve(server.config.root, 'api', `${name}.ts`)
        if (!name || name.startsWith('_') || name.includes('..') || !existsSync(file)) return next()

        // Read JSON body
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const raw = Buffer.concat(chunks).toString('utf8')
        let body: unknown = undefined
        if (raw) {
          try {
            body = JSON.parse(raw)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            return
          }
        }

        // Minimal VercelRequest / VercelResponse shim
        const vreq = Object.assign(req, {
          query: Object.fromEntries(url.searchParams.entries()),
          body,
          cookies: {},
        })
        const vres = Object.assign(res, {
          status(code: number) {
            res.statusCode = code
            return vres
          },
          json(data: unknown) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return vres
          },
          send(data: unknown) {
            res.end(typeof data === 'string' ? data : JSON.stringify(data))
            return vres
          },
        })

        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(vreq, vres)
        } catch (err) {
          console.error('[api dev]', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
          }
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make DATABASE_URL (and other non-VITE_ vars) from .env available to the API in dev.
  // They are NOT exposed to browser code.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v

  return {
    plugins: [react(), tailwindcss(), vercelApiDev()],
  }
})
