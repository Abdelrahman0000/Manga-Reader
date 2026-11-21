# Manga Reader (مانجا)

An Arabic-first web app for discovering and reading fan-translated manga in Arabic, built with React + Vite and deployed on Vercel.

Live: https://manga-reader-dun.vercel.app

## Features

- **Home**: popular titles by default, plus a latest-updates tab.
- **Search**: live search across the source from any page.
- **My List**: save titles you plan to read.
- **Read list**: move finished titles to a separate page.
- **Manga page**: light chapter list showing chapter numbers only; a chapter's content loads on demand when you open it. Sort ascending/descending, filter to unread chapters, per-chapter read marks, a download button next to every chapter, and batch downloads of unread chapters (5 / 10 / 25 / all) as a zip.
- **Reader**: full chapter pages with previous/next navigation; chapters are marked as read automatically.
- **Coverage honesty**: when an Arabic translation is incomplete for a title (e.g. only the latest chapters exist), the app says so explicitly and links out to other Arabic manga sites (MangaLek, MangaSwat, Azora, 3asq) that open on their own sites — no content is mirrored.
- **Outage handling**: if the MangaDex API stops responding, the app retries automatically and shows a clear banner with external alternatives instead of a broken page.
- Lists and read marks persist locally in the browser (localStorage), no account needed.

## Source & credits

All data and images come from the free public [MangaDex](https://mangadex.org) API, identified with a descriptive User-Agent as their policy requires. Arabic translations are the work of volunteer scanlation groups, who are credited on each chapter; their coverage is not complete for every title.

## Project structure

```
api/proxy.js     Vercel serverless function: same-origin proxy to the MangaDex
                 API and image hosts with an identifying User-Agent
public/          Static assets served as-is (favicon, robots.txt)
src/             React application
  api.js         MangaDex client: search, lists, chapters, pages, retries,
                 source-availability events
  App.jsx        Routes, header, source-outage banner, footer
  HomePage.jsx   Popular / latest tabs and search results
  MangaPage.jsx  Title details, chapter number grid, filters, downloads
  ReaderPage.jsx Chapter reader
  ListPage.jsx   My List / Read pages
  store.js       localStorage persistence (lists, read marks)
  download.js    Zip building and saving (with in-app-browser detection)
  ui.jsx         Shared components
  main.jsx       Entry point (HashRouter)
  styles.css
index.html
vite.config.js   Dev/preview mirror of the proxy
```

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The `dist/` output is deployed to Vercel; `api/proxy.js` is deployed as a serverless function.

---

Made by Abdelrahman Khalifa
