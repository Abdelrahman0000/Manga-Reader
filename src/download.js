import JSZip from 'jszip'
import { fetchChapterPages } from './api.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// In-app browsers (WhatsApp, Facebook, Instagram, Telegram…) silently swallow
// programmatic blob downloads. Detect them so the UI can tell the user to open
// the site in a real browser instead of looking broken.
export function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|Instagram|WhatsApp|Telegram|TikTok|Line\/|MicroMessenger|Twitter/i.test(ua)) return true
  // Generic Android WebView token
  if (/Android.*; wv\)/.test(ua)) return true
  return false
}

// Anchor-download support check (very old browsers / odd webviews)
export function canAnchorDownload() {
  return typeof HTMLAnchorElement !== 'undefined' && 'download' in HTMLAnchorElement.prototype
}

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

// Builds one zip: {mangaTitle}/فصل-{n}/صفحة-XX.jpg — returns the blob so the
// caller decides how to save/share it.
export async function buildChaptersZip({ mangaTitle, chapters, onProgress }) {
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
      if (!pages.length) throw new Error('no pages')
      const folder = root.folder(`فصل-${num}`)
      for (let i = 0; i < pages.length; i++) {
        const blob = await fetchBlob(pages[i])
        const ext = /\.png($|\?)/.test(pages[i]) ? 'png' : 'jpg'
        folder.file(`صفحة-${String(i + 1).padStart(2, '0')}.${ext}`, blob)
        await sleep(120) // be gentle with the image nodes
      }
    } catch {
      failed.push(label)
    }
    done++
    onProgress?.({ done, total: chapters.length, current: label })
  }

  if (failed.length === chapters.length) throw new Error('all failed')
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  return { blob, failed }
}

// Saves a blob as a file. Returns true when a real save/share path was taken.
export async function saveBlobAs(blob, filename) {
  // Prefer the native share sheet on mobile when anchor downloads are
  // unavailable — it offers "Save to Files/Downloads" directly.
  try {
    if (!canAnchorDownload() && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/zip' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
        return true
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return true // user closed the sheet — not a failure
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to actually start writing before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}

// One call = full download flow for a set of chapters.
export async function downloadChapters({ mangaTitle, chapters, onProgress }) {
  const { blob, failed } = await buildChaptersZip({ mangaTitle, chapters, onProgress })
  const nums = chapters.map((c) => c.attributes?.chapter || '?')
  const name = chapters.length === 1
    ? `${mangaTitle} - فصل ${nums[0]}.zip`
    : `${mangaTitle}.zip`
  await saveBlobAs(blob, name)
  return { failed }
}
