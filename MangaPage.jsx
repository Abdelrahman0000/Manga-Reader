import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchManga, fetchChapters, fetchStats, coverUrl, mangaTitle, mangaAltTitle, mangaDescription, mangaAuthor,
} from './api.js'
import {
  snapshotManga, inMyList, toggleMyList, inReadList, toggleReadList, getReadChapters, markChapter,
} from './store.js'
import { downloadChapters } from './download.js'
import { Spinner, ErrorNote, toCardShape } from './ui.jsx'

const STATUS_AR = { ongoing: 'مستمرة', completed: 'مكتملة', hiatus: 'متوقفة مؤقتًا', cancelled: 'ملغاة' }

export default function MangaPage() {
  const { id } = useParams()
  const [manga, setManga] = useState(null)
  const [chapters, setChapters] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [inList, setInList] = useState(() => inMyList(id))
  const [inDone, setInDone] = useState(() => inReadList(id))
  const [readSet, setReadSet] = useState(() => getReadChapters(id))
  const [dlCount, setDlCount] = useState('5')
  const [dlState, setDlState] = useState(null) // {done,total,current} | 'zipping' | null
  const [dlResult, setDlResult] = useState(null)

  const load = async () => {
    try {
      setError(null)
      const m = await fetchManga(id)
      setManga(m)
      fetchStats([id]).then((s) => setStats(s[id] || null)).catch(() => {})
      const chs = await fetchChapters(id)
      setChapters(chs)
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    setManga(null); setChapters(null); setError(null)
    setInList(inMyList(id)); setInDone(inReadList(id)); setReadSet(getReadChapters(id))
    load()
    window.scrollTo(0, 0)
  }, [id])

  const snap = useMemo(() => {
    if (!manga) return null
    return snapshotManga(toCardShape(manga))
  }, [manga])

  if (error) return <main className="page"><ErrorNote error={error} onRetry={load} /></main>
  if (!manga) return <main className="page"><Spinner /></main>

  const title = mangaTitle(manga)
  const alt = mangaAltTitle(manga)
  const cover = coverUrl(manga, 512)
  const desc = mangaDescription(manga)
  const author = mangaAuthor(manga)
  const year = manga.attributes?.year
  const status = STATUS_AR[manga.attributes?.status] || manga.attributes?.status || ''
  const rating = stats?.rating?.average ? stats.rating.average.toFixed(1) : null
  const follows = stats?.follows != null ? stats.follows.toLocaleString('ar-EG') : null

  const unread = (chapters || []).filter((c) => !readSet.has(c.id))
  const chapterNum = (c) => c.attributes?.chapter || '؟'

  const onToggleList = () => { setInList(toggleMyList(snap) ? true : false); setInList(inMyList(id)) }
  const onToggleDone = () => { setInDone(toggleReadList(snap) ? true : false); setInDone(inReadList(id)) }
  const onToggleRead = (ch) => { markChapter(id, ch.id, !readSet.has(ch.id)); setReadSet(getReadChapters(id)) }

  const onDownload = async () => {
    const n = dlCount === 'all' ? unread.length : Math.min(parseInt(dlCount, 10), unread.length)
    if (n === 0) return
    const picked = unread.slice(0, n)
    setDlResult(null)
    setDlState({ done: 0, total: picked.length, current: '' })
    try {
      const { failed } = await downloadChapters({
        mangaTitle: title,
        chapters: picked,
        onProgress: (p) => setDlState(p),
      })
      setDlState('zipping')
      setDlResult(failed.length ? `تم التنزيل مع تعذّر ${failed.length} فصل: ${failed.join('، ')}` : 'تم التنزيل بنجاح ✓')
    } catch {
      setDlResult('فشل التنزيل. حاول مرة أخرى.')
    } finally {
      setDlState(null)
    }
  }

  return (
    <main className="page manga-page">
      <div className="manga-head">
        <div className="manga-cover">{cover ? <img src={cover} alt={title} /> : <div className="no-cover">لا يوجد غلاف</div>}</div>
        <div className="manga-info">
          <h1>{title}</h1>
          {alt && <p className="alt-title">{alt}</p>}
          <div className="meta-row">
            {author && <span>✍️ {author}</span>}
            {year && <span>📅 {year}</span>}
            {status && <span>📌 {status}</span>}
            {rating && <span>★ {rating}</span>}
            {follows && <span>👥 {follows}</span>}
          </div>
          <div className="action-row">
            <button className={inList ? 'btn btn-on' : 'btn'} onClick={onToggleList}>
              {inList ? '✓ في قائمتي — إزالة' : '＋ أضف إلى قائمتي'}
            </button>
            <button className={inDone ? 'btn btn-on' : 'btn'} onClick={onToggleDone}>
              {inDone ? '✓ في مقروء — إزالة' : 'نقل إلى مقروء'}
            </button>
          </div>
        </div>
      </div>
      {desc && <p className="description">{desc}</p>}

      <section className="chapters-section">
        <div className="chapters-head">
          <h2 className="section-title">الفصول بالعربية <span className="count-chip">{chapters ? chapters.length : '…'}</span></h2>
          <div className="download-bar">
            <select value={dlCount} onChange={(e) => setDlCount(e.target.value)} aria-label="عدد الفصول للتنزيل">
              <option value="5">5 فصول</option>
              <option value="10">10 فصول</option>
              <option value="25">25 فصل</option>
              <option value="all">كل غير المقروء</option>
            </select>
            <button className="btn" onClick={onDownload} disabled={!chapters || unread.length === 0 || !!dlState}>
              ⬇ تنزيل غير المقروء ({unread.length})
            </button>
          </div>
        </div>
        {dlState && dlState !== 'zipping' && (
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${(dlState.done / Math.max(dlState.total, 1)) * 100}%` }} />
            <p>جاري تنزيل {dlState.current} — {dlState.done}/{dlState.total}</p>
          </div>
        )}
        {dlState === 'zipping' && <p className="filter-note">جاري ضغط الملف…</p>}
        {dlResult && <p className="filter-note">{dlResult}</p>}

        {!chapters ? <Spinner label="جاري تحميل الفصول…" /> : chapters.length === 0 ? (
          <p className="empty-note">لا توجد فصول مترجمة للعربية لهذا العنوان بعد.</p>
        ) : (
          <ol className="chapter-list" reversed>
            {[...chapters].reverse().map((ch) => {
              const read = readSet.has(ch.id)
              return (
                <li key={ch.id} className={read ? 'chapter-row read' : 'chapter-row'}>
                  <Link to={`/read/${id}/${ch.id}`} className="chapter-link">
                    <span className="chapter-num">فصل {chapterNum(ch)}</span>
                    {ch.attributes?.title && <span className="chapter-name">{ch.attributes.title}</span>}
                    <span className="chapter-pages">{ch.attributes.pages} صفحة</span>
                  </Link>
                  <button
                    className={read ? 'read-toggle on' : 'read-toggle'}
                    onClick={() => onToggleRead(ch)}
                    aria-pressed={read}
                    title={read ? 'إلغاء علامة القراءة' : 'وضع علامة مقروء'}
                  >
                    {read ? '✓ مقروء' : 'علامة مقروء'}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </main>
  )
}
