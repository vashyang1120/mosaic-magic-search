# Mosaic Magic — Spectator Search Prototype v0.2.1

本版已接上正式 Cloudflare Worker + Brave Image Search。

## 已完成
- 真實圖片搜尋
- 不固定三欄的圖片瀑布流
- 點圖全螢幕預覽
- 選定 exact target
- 保存 query + exact image 到 localStorage

## 正式搜尋端點
`https://mosaic-magic-search-api.vashyang1120.workers.dev/images`

## GitHub Pages 更新
將根目錄的 `index.html`、`app.js`、`styles.css`、`config.js` 全部覆蓋成此版本。
`README.md` 可一起更新。

`worker/` 資料夾不需要上傳到 GitHub Pages；Cloudflare Worker 已另行部署。
