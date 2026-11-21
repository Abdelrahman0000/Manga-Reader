import React from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { coverUrl, mangaTitle, mangaAltTitle, mangaAuthor } from './api.js'

export function Header({ query, setQuery }) {
  const navigate = useNavigate()
  const location = useLocation()
  const onSubmit = (e) => {
    e.preventDefault()
    if (location.pathname !== '/' && location.pathname !== '/list' && location.pathname !== '/done') {
      navigate(`/?q=${encodeURIComponent(query)}`)
    }
  }
  return (
    <header className="site-header">
      <div className="header-top">
        <Link to="/" className="brand">📖 مانجا</Link>
        <form className="search-form" onSubmit={onSubmit} role="search">
          <input
            type="search"
            placeholder="ابحث عن مانجا…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="بحث"
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="مسح البحث">✕</button>
          )}
        </form>
      </div>
      <nav className="main-nav">
        <NavLink to="/" end>الرئيسية</NavLink>
        <NavLink to="/list">قائمتي</NavLink>
        <NavLink to="/done">مقروء</NavLink>
      </nav>
    </header>
  )
}

export function MangaCard({ manga, stats }) {
  const cover = manga.cover || coverUrl(manga, 256)
  const title = manga.title || mangaTitle(manga)
  const st = stats?.[manga.id]
  const rating = st?.rating?.average ? st.rating.average.toFixed(1) : null
  return (
    <Link to={`/manga/${manga.id}`} className="manga-card">
      <div className="cover-wrap">
        {cover ? <img src={cover} alt={title} loading="lazy" /> : <div className="no-cover">لا يوجد غلاف</div>}
        {rating && <span className="rating-badge">★ {rating}</span>}
      </div>
      <div className="card-title">{title}</div>
    </Link>
  )
}

export function MangaGrid({ items, stats }) {
  if (!items.length) return <p className="empty-note">لا توجد نتائج.</p>
  return (
    <div className="manga-grid">
      {items.map((m) => <MangaCard key={m.id} manga={m} stats={stats} />)}
    </div>
  )
}

// External Arabic manga sites, offered explicitly when MangaDex coverage is
// incomplete or the source is down. These open in a new tab on the site itself —
// we never mirror their content inside the app.
export function ExternalSources({ title }) {
  const q = encodeURIComponent(title || '')
  const links = [
    { name: 'مانجا ليك', url: q ? `https://lekmanga.net/?s=${q}` : 'https://lekmanga.net/' },
    { name: 'مانجا سوات', url: 'https://meshmanga.com/menu' },
    { name: 'ازورا مانجا', url: 'https://azorafly.com/series' },
    { name: 'فريق العسق', url: q ? `https://3asq.online/?s=${q}&post_type=wp-manga` : 'https://3asq.online/' },
  ]
  return (
    <div className="external-sources">
      <p className="external-title">تدور على فصول مش موجودة هنا؟ ابحث في مواقع مانجا عربية أخرى (تفتح في موقعها):</p>
      <div className="external-links">
        {links.map((l) => (
          <a key={l.name} className="btn btn-small" href={l.url} target="_blank" rel="noopener noreferrer">{l.name} ↗</a>
        ))}
      </div>
    </div>
  )
}

export function Spinner({ label = 'جاري التحميل…' }) {
  return <div className="spinner-wrap"><div className="spinner" /><p>{label}</p></div>
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="error-note">
      <p>حدث خطأ أثناء الاتصال بالمصدر: {String(error.message || error)}</p>
      <p className="error-hint">المصدر الأساسي (MangaDex) قد يكون متوقفًا مؤقتًا — جرّب إعادة المحاولة بعد قليل.</p>
      {onRetry && <button className="btn" onClick={onRetry}>إعادة المحاولة</button>}
    </div>
  )
}

export function toCardShape(m) {
  return {
    id: m.id,
    title: mangaTitle(m),
    altTitle: mangaAltTitle(m),
    cover: coverUrl(m, 256),
    author: mangaAuthor(m),
    year: m.attributes?.year,
    status: m.attributes?.status,
  }
}
