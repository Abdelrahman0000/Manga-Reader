const API = 'https://api.mangadex.org'
const COVERS = 'https://uploads.mangadex.org/covers'

// All MangaDex traffic goes through the same-origin proxy (api/proxy.js),
// which identifies us with a descriptive User-Agent as MangaDex requires.
export function prox(url) {
  return `/api/proxy?u=${encodeURIComponent(url)}`
}

const CONTENT_RATINGS = ['safe', 'suggestive']

function qs(params) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(`${k}[]`, x))
    else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) sp.set(`${k}[${k2}]`, v2)
    else if (v !== undefined && v !== null && v !== '') sp.set(k, v)
  }
  return sp.toString()
}

// MangaDex availability tracking so the UI can show an honest outage state
// and point to external Arabic sources instead of failing silently.
const statusListeners = new Set()
let sourceDown = false
export function onSourceStatus(cb) {
  statusListeners.add(cb)
  cb(sourceDown)
  return () => statusListeners.delete(cb)
}
export function isSourceDown() {
  return sourceDown
}
function setSourceDown(v) {
  if (sourceDown === v) return
  sourceDown = v
  statusListeners.forEach((cb) => cb(v))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJSON(url, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(prox(url))
      if (res.ok) {
        setSourceDown(false)
        return await res.json()
      }
      lastErr = new Error(`MangaDex ${res.status}`)
      // 4xx (except 429) won't heal by retrying
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break
    } catch (e) {
      lastErr = e
    }
    await sleep(700 * (i + 1))
  }
  setSourceDown(true)
  throw lastErr
}

async function get(path, params) {
  return fetchJSON(`${API}${path}?${qs(params)}`)
}

export function coverUrl(manga, size = 256) {
  const rel = (manga.relationships || []).find((r) => r.type === 'cover_art')
  const file = rel?.attributes?.fileName
  return file ? prox(`${COVERS}/${manga.id}/${file}.${size}.jpg`) : null
}

export function mangaTitle(manga) {
  const t = manga.attributes?.title || {}
  const alts = manga.attributes?.altTitles || []
  const arAlt = alts.find((a) => a.ar)?.ar
  return t.ar || arAlt || t.en || t['ja-ro'] || t.ja || Object.values(t)[0] || 'بدون عنوان'
}

export function mangaAltTitle(manga) {
  const t = manga.attributes?.title || {}
  return t.en && t.en !== mangaTitle(manga) ? t.en : null
}

export function mangaDescription(manga) {
  const d = manga.attributes?.description || {}
  return d.ar || d.en || ''
}

export function mangaAuthor(manga) {
  const rel = (manga.relationships || []).find((r) => r.type === 'author')
  return rel?.attributes?.name || ''
}

const baseListParams = {
  'availableTranslatedLanguage': ['ar'],
  'contentRating': CONTENT_RATINGS,
  'includes': ['cover_art', 'author'],
  'hasAvailableChapters': 'true',
}

export async function fetchPopular(offset = 0, limit = 24) {
  return get('/manga', { ...baseListParams, 'order': { followedCount: 'desc' }, limit, offset })
}

export async function fetchRecent(offset = 0, limit = 24) {
  return get('/manga', { ...baseListParams, 'order': { latestUploadedChapter: 'desc' }, limit, offset })
}

export async function searchManga(title, offset = 0, limit = 24) {
  return get('/manga', { ...baseListParams, title, 'order': { relevance: 'desc' }, limit, offset })
}

export async function fetchManga(id) {
  const json = await fetchJSON(`${API}/manga/${id}?${qs({ includes: ['cover_art', 'author', 'artist'] })}`)
  return json.data
}

export async function fetchStats(ids) {
  if (!ids.length) return {}
  const sp = new URLSearchParams()
  ids.forEach((id) => sp.append('manga[]', id))
  const res = await fetch(prox(`${API}/statistics/manga?${sp}`))
  if (!res.ok) return {}
  const json = await res.json()
  return json.statistics || {}
}

export async function fetchChapters(mangaId) {
  const all = []
  let offset = 0
  const limit = 500
  for (;;) {
    const sp = new URLSearchParams()
    sp.append('translatedLanguage[]', 'ar')
    sp.append('order[chapter]', 'asc')
    sp.set('limit', limit)
    sp.set('offset', offset)
    CONTENT_RATINGS.forEach((r) => sp.append('contentRating[]', r))
    sp.append('includes[]', 'scanlation_group')
    const json = await fetchJSON(`${API}/manga/${mangaId}/feed?${sp}`)
    all.push(...json.data)
    if (offset + limit >= json.total) break
    offset += limit
  }
  // dedupe by chapter number, keep the entry with pages
  const seen = new Map()
  for (const ch of all) {
    const num = ch.attributes?.chapter ?? `x-${ch.id}`
    const prev = seen.get(num)
    if (!prev || (prev.attributes.pages === 0 && ch.attributes.pages > 0)) seen.set(num, ch)
  }
  return [...seen.values()].filter((c) => c.attributes.pages > 0)
}

export function chapterGroup(ch) {
  const rel = (ch.relationships || []).find((r) => r.type === 'scanlation_group')
  return rel?.attributes?.name || ''
}

export async function fetchChapterPages(chapterId) {
  const json = await fetchJSON(`${API}/at-home/server/${chapterId}`)
  const { baseUrl, chapter } = json
  const mk = (mode, files) => files.map((f) => prox(`${baseUrl}/${mode}/${chapter.hash}/${f}`))
  return {
    data: mk('data', chapter.data || []),
    dataSaver: mk('data-saver', chapter.dataSaver || []),
  }
}
