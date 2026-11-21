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

async function get(path, params) {
  const url = `${API}${path}?${qs(params)}`
  const res = await fetch(prox(url))
  if (!res.ok) throw new Error(`MangaDex ${res.status}`)
  return res.json()
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
  const res = await fetch(prox(`${API}/manga/${id}?${qs({ includes: ['cover_art', 'author', 'artist'] })}`))
  if (!res.ok) throw new Error(`MangaDex ${res.status}`)
  const json = await res.json()
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
    const res = await fetch(prox(`${API}/manga/${mangaId}/feed?${sp}`))
    if (!res.ok) throw new Error(`MangaDex ${res.status}`)
    const json = await res.json()
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

export async function fetchChapterPages(chapterId) {
  const res = await fetch(prox(`${API}/at-home/server/${chapterId}`))
  if (!res.ok) throw new Error(`MangaDex ${res.status}`)
  const json = await res.json()
  const { baseUrl, chapter } = json
  const mk = (mode, files) => files.map((f) => prox(`${baseUrl}/${mode}/${chapter.hash}/${f}`))
  return {
    data: mk('data', chapter.data || []),
    dataSaver: mk('data-saver', chapter.dataSaver || []),
  }
}
