import React, { useMemo, useState } from 'react'
import { getMyList, getReadList } from './store.js'
import { MangaGrid } from './ui.jsx'

export function LocalListPage({ query, kind }) {
  const [items] = useState(() => (kind === 'list' ? getMyList() : getReadList()))
  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return items.filter((m) =>
      (m.title || '').includes(q) || (m.altTitle || '').toLowerCase().includes(q.toLowerCase()) || (m.author || '').includes(q)
    )
  }, [items, query])

  const title = kind === 'list' ? 'قائمتي' : 'مقروء'
  const emptyText = kind === 'list'
    ? 'قائمتك فارغة. افتح أي مانجا واضغط «أضف إلى قائمتي».'
    : 'لا يوجد مانجا في صفحة مقروء بعد. من صفحة المانجا اضغط «نقل إلى مقروء».'

  return (
    <main className="page">
      <h2 className="section-title">{title} <span className="count-chip">{filtered.length}</span></h2>
      {query.trim() && <p className="filter-note">تصفية حسب: «{query.trim()}»</p>}
      {items.length === 0 ? <p className="empty-note">{emptyText}</p> : <MangaGrid items={filtered} stats={{}} />}
    </main>
  )
}
