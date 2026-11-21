// Same-origin proxy for MangaDex public API and image hosts.
// MangaDex asks API clients to identify themselves with a descriptive
// User-Agent, which browsers cannot set on fetch(); this proxy sends one.
const ALLOWED_HOSTS = new Set([
  'api.mangadex.org',
  'uploads.mangadex.org',
])
const ALLOWED_SUFFIX = '.mangadex.network'

export default async function handler(req, res) {
  try {
    const target = req.query.u
    if (!target) return res.status(400).send('missing u')
    let url
    try {
      url = new URL(target)
    } catch {
      return res.status(400).send('bad url')
    }
    const ok =
      url.protocol === 'https:' &&
      (ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith(ALLOWED_SUFFIX))
    if (!ok) return res.status(403).send('host not allowed')

    const upstream = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AbdoMangaReader/1.0 (github.com/Abdelrahman0000)' },
      redirect: 'follow',
    })
    res.status(upstream.status)
    const type = upstream.headers.get('content-type')
    if (type) res.setHeader('content-type', type)
    res.setHeader('cache-control', type && type.startsWith('image/')
      ? 'public, max-age=86400'
      : 'public, max-age=300')
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.send(buf)
  } catch (e) {
    res.status(502).send('proxy error')
  }
}
