// Local browser persistence (localStorage) — no account needed.
const KEYS = {
  myList: 'manga-mylist',
  readList: 'manga-readlist',
  readChapters: 'manga-readchapters',
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — keep app working in-memory */
  }
}

export function snapshotManga(m, extra = {}) {
  return {
    id: m.id,
    title: m.title,
    altTitle: m.altTitle || null,
    cover: m.cover || null,
    author: m.author || '',
    year: m.year || null,
    status: m.status || '',
    ...extra,
  }
}

export function getMyList() {
  return load(KEYS.myList, [])
}
export function inMyList(id) {
  return getMyList().some((m) => m.id === id)
}
export function toggleMyList(mangaSnap) {
  const list = getMyList()
  const i = list.findIndex((m) => m.id === mangaSnap.id)
  if (i >= 0) list.splice(i, 1)
  else list.unshift({ ...mangaSnap, addedAt: Date.now() })
  save(KEYS.myList, list)
  return i < 0
}

export function getReadList() {
  return load(KEYS.readList, [])
}
export function inReadList(id) {
  return getReadList().some((m) => m.id === id)
}
export function toggleReadList(mangaSnap) {
  const list = getReadList()
  const i = list.findIndex((m) => m.id === mangaSnap.id)
  if (i >= 0) list.splice(i, 1)
  else list.unshift({ ...mangaSnap, finishedAt: Date.now() })
  save(KEYS.readList, list)
  return i < 0
}

export function getReadChapters(mangaId) {
  const all = load(KEYS.readChapters, {})
  return new Set(all[mangaId] || [])
}
export function isChapterRead(mangaId, chapterId) {
  return getReadChapters(mangaId).has(chapterId)
}
export function markChapter(mangaId, chapterId, read = true) {
  const all = load(KEYS.readChapters, {})
  const set = new Set(all[mangaId] || [])
  if (read) set.add(chapterId)
  else set.delete(chapterId)
  all[mangaId] = [...set]
  save(KEYS.readChapters, all)
  return set
}
