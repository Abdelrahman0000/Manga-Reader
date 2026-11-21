import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ALLOWED_HOSTS = new Set(['api.mangadex.org', 'uploads.mangadex.org'])
const ALLOWED_SUFFIX = '.mangadex.network'

// Local mirror of api/proxy.js so dev/preview behaves like production.
function mangaProxy() {
  const handle = async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost').searchParams.get('u')
      const url = new URL(u || '')
      const ok =
        url.protocol === 'https:' &&
        (ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith(ALLOWED_SUFFIX))
      if (!ok) {
        res.statusCode = 403
        return res.end('host not allowed')
      }
      const upstream = await fetch(url.toString(), {
        headers: { 'User-Agent': 'AbdoMangaReader/1.0 (github.com/Abdelrahman0000)' },
        redirect: 'follow',
      })
      res.statusCode = upstream.status
      const type = upstream.headers.get('content-type')
      if (type) res.setHeader('content-type', type)
      res.setHeader(
        'cache-control',
        type && type.startsWith('image/') ? 'public, max-age=86400' : 'public, max-age=300'
      )
      res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      res.statusCode = 502
      res.end('proxy error')
    }
  }
  return {
    name: 'mangadex-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy', handle)
    },
  }
}

export default defineConfig({
  plugins: [react(), mangaProxy()],
  base: '/',
})
