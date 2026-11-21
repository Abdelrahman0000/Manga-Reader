import React, { useEffect, useState, useCallback } from 'react'
import { fetchPopular, fetchRecent, searchManga, fetchStats } from './api.js'
import { MangaGrid, Spinner, ErrorNote } from './ui.jsx'

const PAGE = 24

export default function HomePage({ query }) {
  const [tab, setTab] = useState('popular') // popular = default
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const searching = query.trim().length > 0

  const load = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true); else setLoadingMore(true)
      setError(null)
      const fn = searching ? (o, l) => searchManga(query.trim(), o, l) : tab === 'popular' ? fetchPopular : fetchRecent
      const res = await fn(offset, PAGE)
      const data = res.data || []
      setItems((prev) => (append ? [...prev, ...data] : data))
      setTotal(res.total ?? data.length)
      const st = await fetchStats(data.map((m) => m.id))
      setStats((prev) => (append ? { ...prev, ...st } : st))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tab, query, searching])

  useEffect(() => {
    const t = setTimeout(() => load(0, false), searching ? 350 : 0)
    return () => clearTimeout(t)
  }, [load])

  return (
    <main className="page">
      {!searching && (
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'popular'} className={tab === 'popular' ? 'tab active' : 'tab'} onClick={() => setTab('popular')}>شائع</button>
          <button role="tab" aria-selected={tab === 'recent'} className={tab === 'recent' ? 'tab active' : 'tab'} onClick={() => setTab('recent')}>حديث</button>
        </div>
      )}
      {searching && <h2 className="section-title">نتائج البحث عن «{query.trim()}»</h2>}
      {error && <ErrorNote error={error} onRetry={() => load(0, false)} />}
      {loading ? <Spinner /> : (
        <>
          <MangaGrid items={items} stats={stats} />
          {items.length < total && (
            <div className="load-more-wrap">
              <button className="btn" disabled={loadingMore} onClick={() => load(items.length, true)}>
                {loadingMore ? 'جاري التحميل…' : 'تحميل المزيد'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
