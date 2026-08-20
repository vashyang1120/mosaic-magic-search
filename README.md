# Mosaic Magic — Spectator Search Prototype v0.2.5

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


## v0.2.5 修正
- 修正 Worker 回傳 `thumbnail` 為字串 URL 時，前端誤判為沒有縮圖而把所有搜尋結果過濾掉的問題。

## v0.2.5 診斷修正
- `index.html` 為 CSS / config / app 加上版本參數，強制手機瀏覽器載入最新版，不再沿用舊快取。
- 搜尋結果解析支援 `thumbnail` 字串、`thumbnail.src`、`thumbUrl`、`imageUrl`、`properties.url` 等格式。
- 搜尋後會短暫顯示 API 回傳筆數與成功解析筆數，方便定位資料鏈問題。


## v0.2.5 選圖流程
- 點搜尋結果後全螢幕預覽。
- 原圖載入失敗時自動退回縮圖，不會讓預覽空白。
- 按「選這張」後保存 `query + exact image + selectedAt` 到 localStorage。
- 搜尋結果中會標示已選圖片，底部顯示已選定狀態，可重新選擇。
- 開發測試時網址加上 `?debug=1`，可直接看到系統實際保存的 selection JSON；正式表演不需要使用。


## v0.2.5 Google Images-style interaction
- 正式觀眾版移除藍框、勾勾、「已選定」與「重新選擇」等魔術感 UI。
- 搜尋結果改為圖片 + 簡短標題 + 來源。
- 結果中段插入「相關搜尋」區塊。
- 點任一圖片直接進入 Preview；該點擊即成為目前 target。
- Preview 包含來源、標題、造訪、分享、儲存、更多與關閉按鈕，以及下方相關圖片。
- 關閉 Preview 後可再點其他圖片；最後打開的圖片會覆蓋 current target。
- `?debug=1` 仍可顯示目前 background target，正式表演不要使用。
