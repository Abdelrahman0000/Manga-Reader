import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchManga, fetchChapters, fetchStats, coverUrl, mangaTitle, mangaAltTitle, mangaDescription, mangaAuthor, chapterGroup,
} from './api.js'
import {
  snapshotManga, inMyList, toggleMyList, inReadList, toggleReadList, getReadChapters, markChapter,
} from './store.js'
import { downloadChapters, isInAppBrowser } from './download.js'
import { Spinner, ErrorNote, toCardShape, ExternalSources } from './ui.jsx'

const STATUS_AR = { ongoing: 'مستمرة', completed: 'مكتملة', hiatus: 'متوقفة مؤقتًا', cancelled: 'ملغاة' }

// Chapter numbers arrive as strings ("12", "12.5", sometimes null) — sort numerically.
function chapterSortValue(ch) {
  const n = parseFloat(ch.attributes?.chapter)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

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
  const [order, setOrder] = useState('desc') // 'asc' = من الأقدم, 'desc' = من الأحدث
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [dlChapter, setDlChapter] = useState(null) // chapter id being downloaded
  const [inApp] = useState(() => isInAppBrowser())

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

  const visibleChapters = useMemo(() => {
    if (!chapters) return []
    const sorted = [...chapters].sort((a, b) => chapterSortValue(a) - chapterSortValue(b))
    if (order === 'desc') sorted.reverse()
    return unreadOnly ? sorted.filter((c) => !readSet.has(c.id)) : sorted
  }, [chapters, order, unreadOnly, readSet])

  if (error) {
    return (
      <main className="page">
        <ErrorNote error={error} onRetry={load} />
        <ExternalSources title="" />
      </main>
    )
  }
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

  // Honest coverage from the source's own numbers: if the highest Arabic chapter
  // number exceeds the number of available Arabic chapters, intermediate chapters
  // are missing in Arabic. MangaDex's lastChapter (when set) tells how far the
  // work itself has gone.
  const lastCh = parseFloat(manga.attributes?.lastChapter)
  const arMax = (chapters || []).reduce((m, c) => Math.max(m, chapterSortValue(c)), 0)
  const gapsInArabic = chapters && chapters.length > 0 && arMax > chapters.length
  const behindWork = chapters && Number.isFinite(lastCh) && lastCh > arMax + 0.5
  const partialCoverage = Boolean(gapsInArabic || behindWork)

  const onToggleList = () => { toggleMyList(snap); setInList(inMyList(id)) }
  const onToggleDone = () => { toggleReadList(snap); setInDone(inReadList(id)) }
  const onToggleRead = (ch) => { markChapter(id, ch.id, !readSet.has(ch.id)); setReadSet(getReadChapters(id)) }

  const onDownload = async () => {
    const ascending = [...unread].sort((a, b) => chapterSortValue(a) - chapterSortValue(b))
    const n = dlCount === 'all' ? ascending.length : Math.min(parseInt(dlCount, 10), ascending.length)
    if (n === 0) return
    const picked = ascending.slice(0, n)
    setDlResult(null)
    setDlState({ done: 0, total: picked.length, current: '' })
    try {
      const { failed } = await downloadChapters({
        mangaTitle: title,
        chapters: picked,
        onProgress: (p) => setDlState(p),
      })
      setDlResult(failed.length ? `تم التنزيل مع تعذّر ${failed.length} فصل: ${failed.join('، ')}` : 'تم التنزيل بنجاح ✓')
    } catch {
      setDlResult('فشل التنزيل. لو أنت داخل متصفح واتساب أو تطبيق آخر، افتح الموقع في كروم أو سفاري وحاول تاني.')
    } finally {
      setDlState(null)
    }
  }

  const onDownloadOne = async (ch) => {
    if (dlChapter) return
    setDlResult(null)
    setDlChapter(ch.id)
    try {
      const { failed } = await downloadChapters({
        mangaTitle: title,
        chapters: [ch],
        onProgress: () => {},
      })
      setDlResult(failed.length ? `تعذّر تنزيل ${failed[0]}.` : `تم تنزيل فصل ${chapterNum(ch)} ✓`)
    } catch {
      setDlResult(`فشل تنزيل فصل ${chapterNum(ch)}. لو أنت داخل متصفح واتساب، افتح الموقع في كروم أو سفاري وحاول تاني.`)
    } finally {
      setDlChapter(null)
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

        {inApp && (
          <p className="coverage-note">
            يبدو أنك فاتح الموقع داخل متصفح تطبيق (واتساب مثلًا) — التنزيل غالبًا لا يعمل هنا.
            افتح الموقع في كروم أو سفاري (من قائمة ⋮ اختر «فتح في المتصفح») وجرّب التنزيل من هناك.
          </p>
        )}
        {partialCoverage && (
          <p className="coverage-note">
            الترجمة العربية على MangaDex غير مكتملة لهذا العنوان: متاح {chapters.length} فصلًا حتى فصل {arMax}
            {behindWork ? ` بينما وصل العمل نفسه للفصل ${manga.attributes.lastChapter}` : '، وفيه أرقام فصول غير مترجمة للعربية'}.
          </p>
        )}

        {!chapters ? <Spinner label="جاري تحميل الفصول…" /> : chapters.length === 0 ? (
          <>
            <p className="empty-note">لا توجد فصول مترجمة للعربية لهذا العنوان على MangaDex بعد.</p>
            <ExternalSources title={alt || title} />
          </>
        ) : (
          <>
            <div className="chapter-toolbar" role="group" aria-label="خيارات عرض الفصول">
              <div className="order-toggle">
                <button
                  className={order === 'asc' ? 'btn btn-small btn-on' : 'btn btn-small'}
                  onClick={() => setOrder('asc')}
                >
                  ↑ من الأقدم
                </button>
                <button
                  className={order === 'desc' ? 'btn btn-small btn-on' : 'btn btn-small'}
                  onClick={() => setOrder('desc')}
                >
                  ↓ من الأحدث
                </button>
              </div>
              <button
                className={unreadOnly ? 'btn btn-small btn-on' : 'btn btn-small'}
                onClick={() => setUnreadOnly((v) => !v)}
                aria-pressed={unreadOnly}
              >
                {unreadOnly ? '✓ غير المقروء فقط' : 'غير المقروء فقط'}
              </button>
              {unreadOnly && <span className="filter-note">{visibleChapters.length} فصل غير مقروء</span>}
            </div>

            {visibleChapters.length === 0 ? (
              <p className="empty-note">كل الفصول مقروءة 🎉</p>
            ) : (
              <div className="chapter-grid">
                {visibleChapters.map((ch) => {
                  const read = readSet.has(ch.id)
                  const group = chapterGroup(ch)
                  const tip = `فصل ${chapterNum(ch)}${ch.attributes?.title ? ` — ${ch.attributes.title}` : ''}${group ? ` — ${group}` : ''} — ${ch.attributes.pages} صفحة`
                  return (
                    <div key={ch.id} className={read ? 'chapter-chip read' : 'chapter-chip'}>
                      <Link to={`/read/${id}/${ch.id}`} className="chip-link" title={tip}>
                        <span className="chip-num">{chapterNum(ch)}</span>
                        {read && <span className="chip-read-mark" aria-label="مقروء">✓</span>}
                      </Link>
                      <div className="chip-actions">
                        <button
                          className="chip-toggle"
                          onClick={() => onToggleRead(ch)}
                          aria-pressed={read}
                          title={read ? 'إلغاء علامة القراءة' : 'وضع علامة مقروء'}
                        >
                          {read ? '✕' : '✓'}
                        </button>
                        <button
                          className="chip-dl"
                          onClick={() => onDownloadOne(ch)}
                          disabled={!!dlChapter}
                          title={`تنزيل فصل ${chapterNum(ch)}`}
                          aria-label={`تنزيل فصل ${chapterNum(ch)}`}
                        >
                          {dlChapter === ch.id ? '…' : '⬇'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {partialCoverage && <ExternalSources title={alt || title} />}
          </>
        )}
      </section>
    </main>
  )
}
