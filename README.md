# Mosaic Magic — Spectator Search Prototype v0.2.9

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


## v0.2.9 修正
- 修正 Worker 回傳 `thumbnail` 為字串 URL 時，前端誤判為沒有縮圖而把所有搜尋結果過濾掉的問題。

## v0.2.9 診斷修正
- `index.html` 為 CSS / config / app 加上版本參數，強制手機瀏覽器載入最新版，不再沿用舊快取。
- 搜尋結果解析支援 `thumbnail` 字串、`thumbnail.src`、`thumbUrl`、`imageUrl`、`properties.url` 等格式。
- 搜尋後會短暫顯示 API 回傳筆數與成功解析筆數，方便定位資料鏈問題。


## v0.2.9 選圖流程
- 點搜尋結果後全螢幕預覽。
- 原圖載入失敗時自動退回縮圖，不會讓預覽空白。
- 按「選這張」後保存 `query + exact image + selectedAt` 到 localStorage。
- 搜尋結果中會標示已選圖片，底部顯示已選定狀態，可重新選擇。
- 開發測試時網址加上 `?debug=1`，可直接看到系統實際保存的 selection JSON；正式表演不需要使用。


## v0.2.9 Google Images-style interaction
- 正式觀眾版移除藍框、勾勾、「已選定」與「重新選擇」等魔術感 UI。
- 搜尋結果改為圖片 + 簡短標題 + 來源。
- 結果中段插入「相關搜尋」區塊。
- 點任一圖片直接進入 Preview；該點擊即成為目前 target。
- Preview 包含來源、標題、造訪、分享、儲存、更多與關閉按鈕，以及下方相關圖片。
- 關閉 Preview 後可再點其他圖片；最後打開的圖片會覆蓋 current target。
- `?debug=1` 仍可顯示目前 background target，正式表演不要使用。


## v0.2.9 regression fix
- 修正 v0.2.5 錯誤讀取 `window.MOSAIC_CONFIG.apiBase` 的問題。
- 恢復已在 v0.2.4 實機驗證成功的 `window.MOSAIC_MAGIC_CONFIG.SEARCH_API_URL` 串接方式。
- 保留 v0.2.5 的圖片搜尋結果、相關搜尋、點圖 Preview 與背景 target 記錄。
- `?debug=1` 搜尋失敗時會顯示實際錯誤原因。


## v0.2.9 mobile Back / Preview stability fix
- Preview 開啟時使用 `history.pushState()` 建立一層頁內歷史。
- Android / iPhone 的瀏覽器返回鍵現在會先關閉 Preview，不會直接離開 Spectator Search。
- 關閉 Preview 時釋放圖片 `src`，降低手機瀏覽器記憶體壓力。
- Preview 優先顯示 Brave thumbnail；exact original `imageUrl` 仍完整保存在 background target，供之後 Mosaic 使用。
- 正式網址不顯示 Current target 黑色 debug panel；只有 `?debug=1` 才顯示。
- 修正窄螢幕上「搜尋」按鈕被壓成直排文字。


## v0.2.9 visual fidelity pass
- 依照實機 Google Images 截圖調整 Google 標誌比例與配色。
- 搜尋框改成更接近 Google 的高度、邊框、陰影與文字配置。
- 調整搜尋分類 tab 的間距、字級與藍色底線。
- 搜尋結果標題、來源、相關搜尋卡片的比例更接近 Google Images。
- Preview 的來源列、圖片區、標題、造訪、分享與儲存按鈕重新調整。
- 不變更已驗證成功的 Brave/Cloudflare 搜尋串接與返回鍵邏輯。


## v0.2.9 Google-like density + functional tabs
- 依照實機截圖縮小 Logo、搜尋框、Tabs 與結果字級，增加首屏資訊密度。
- 搜尋框右側改為更接近 Google 的清除 + 語音圖示感，不再顯示藍色「搜尋」文字。
- 圖片結果 gutter、圓角、標題與來源比例再次縮小。
- 建議搜尋 chips 改為更接近 Google 的尺寸與結構。
- AI 模式／全部／影片／短片／新聞／購物／網頁 Tabs 現在都能點擊，會切到合理的結果頁。
- 切回「圖片」時保留原本圖片搜尋結果與捲動位置。
- 不變更已驗證成功的 Brave/Cloudflare 圖片搜尋與 Preview target 邏輯。
