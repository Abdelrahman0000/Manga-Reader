import JSZip from 'jszip'
import { fetchChapterPages } from './api.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchBlob(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.blob()
    } catch { /* retry below */ }
    await sleep(800 * (i + 1))
  }
  throw new Error('page failed')
}

// Downloads chapters as one zip: {mangaTitle}/فصل-{n}/page-XX.jpg
export async function downloadChapters({ mangaTitle, chapters, onProgress }) {
  const zip = new JSZip()
  const root = zip.folder(mangaTitle.replace(/[\\/:*?"<>|]/g, '_'))
  const failed = []
  let done = 0

  for (const ch of chapters) {
    const num = ch.attributes?.chapter || '?'
    const label = `فصل ${num}`
    onProgress?.({ done, total: chapters.length, current: label })
    try {
      const { dataSaver, data } = await fetchChapterPages(ch.id)
      const pages = dataSaver.length ? dataSaver : data
      const folder = root.folder(`فصل-${num}`)
      for (let i = 0; i < pages.length; i++) {
        const blob = await fetchBlob(pages[i])
        const ext = pages[i].endsWith('.png') ? 'png' : 'jpg'
        folder.file(`صفحة-${String(i + 1).padStart(2, '0')}.${ext}`, blob)
        await sleep(120) // be gentle with the image nodes
      }
    } catch {
      failed.push(label)
    }
    done++
    onProgress?.({ done, total: chapters.length, current: label })
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${mangaTitle}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return { failed }
}
