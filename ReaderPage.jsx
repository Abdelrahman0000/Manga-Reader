import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchChapterPages, fetchChapters, fetchManga, mangaTitle } from './api.js'
import { markChapter } from './store.js'
import { Spinner, ErrorNote } from './ui.jsx'

export default function ReaderPage() {
  const { mangaId, chapterId } = useParams()
  const navigate = useNavigate()
  const [pages, setPages] = useState(null)
  const [chapters, setChapters] = useState(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setPages(null); setError(null)
    window.scrollTo(0, 0)
    markChapter(mangaId, chapterId, true) // وضع علامة مقروء تلقائيًا
    fetchChapterPages(chapterId)
      .then((p) => { if (!cancelled) setPages(p.data.length ? p.data : p.dataSaver) })
      .catch((e) => { if (!cancelled) setError(e) })
    if (!chapters) {
      fetchChapters(mangaId).then((c) => !cancelled && setChapters(c)).catch(() => {})
      fetchManga(mangaId).then((m) => !cancelled && setTitle(mangaTitle(m))).catch(() => {})
    }
    return () => { cancelled = true }
  }, [chapterId, mangaId])

  const { prev, next, current } = useMemo(() => {
    if (!chapters) return {}
    const i = chapters.findIndex((c) => c.id === chapterId)
    return {
      current: chapters[i],
      prev: i > 0 ? chapters[i - 1] : null, // ascending list: lower index = earlier chapter
      next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null,
    }
  }, [chapters, chapterId])

  const num = current?.attributes?.chapter || ''

  return (
    <main className="reader-page">
      <div className="reader-bar">
        <Link to={`/manga/${mangaId}`} className="btn btn-small">→ رجوع</Link>
        <div className="reader-title">{title} {num && `— فصل ${num}`}</div>
        <div className="reader-nav">
          <button className="btn btn-small" disabled={!prev} onClick={() => navigate(`/read/${mangaId}/${prev.id}`)}>السابق</button>
          <button className="btn btn-small" disabled={!next} onClick={() => navigate(`/read/${mangaId}/${next.id}`)}>التالي</button>
        </div>
      </div>
      {error && <ErrorNote error={error} onRetry={() => window.location.reload()} />}
      {!pages && !error && <Spinner label="جاري تحميل الصفحات…" />}
      {pages && (
        <div className="pages-column">
          {pages.map((src, i) => (
            <img key={src} src={src} alt={`صفحة ${i + 1}`} loading={i < 3 ? 'eager' : 'lazy'} />
          ))}
          <div className="reader-end">
            <p>نهاية الفصل {num}</p>
            {next
              ? <button className="btn" onClick={() => navigate(`/read/${mangaId}/${next.id}`)}>الفصل التالي ←</button>
              : <Link className="btn" to={`/manga/${mangaId}`}>العودة لصفحة المانجا</Link>}
          </div>
        </div>
      )}
    </main>
  )
}
