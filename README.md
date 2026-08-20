# Mosaic Magic — Spectator Search Prototype v0.2.3

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


## v0.2.3 修正
- 修正 Worker 回傳 `thumbnail` 為字串 URL 時，前端誤判為沒有縮圖而把所有搜尋結果過濾掉的問題。

## v0.2.3 診斷修正
- `index.html` 為 CSS / config / app 加上版本參數，強制手機瀏覽器載入最新版，不再沿用舊快取。
- 搜尋結果解析支援 `thumbnail` 字串、`thumbnail.src`、`thumbUrl`、`imageUrl`、`properties.url` 等格式。
- 搜尋後會短暫顯示 API 回傳筆數與成功解析筆數，方便定位資料鏈問題。
