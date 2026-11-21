import React, { useEffect, useState } from 'react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
import { Header } from './ui.jsx'
import HomePage from './HomePage.jsx'
import { LocalListPage } from './ListPage.jsx'
import MangaPage from './MangaPage.jsx'
import ReaderPage from './ReaderPage.jsx'

export default function App() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => {
    const fromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q')
    const fromSearch = new URLSearchParams(window.location.search).get('q')
    return fromHash || fromSearch || ''
  })

  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setQuery(q)
  }, [params])

  return (
    <div className="app">
      <Header query={query} setQuery={setQuery} />
      <Routes>
        <Route path="/" element={<HomePage query={query} />} />
        <Route path="/list" element={<LocalListPage query={query} kind="list" />} />
        <Route path="/done" element={<LocalListPage query={query} kind="done" />} />
        <Route path="/manga/:id" element={<MangaPage />} />
        <Route path="/read/:mangaId/:chapterId" element={<ReaderPage />} />
        <Route path="*" element={<main className="page"><p className="empty-note">الصفحة غير موجودة.</p></main>} />
      </Routes>
      <footer className="site-footer">
        <p>المحتوى مقدم عبر MangaDex — الترجمات العربية من فرق الفحص المتطوعة وتغطيتها غير كاملة لكل العناوين.</p>
        <p>صنع بواسطة <strong>عبدالرحمن خليفة</strong> © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
