# Mosaic Magic — Spectator Handoff v0.3.0

這一版改用極簡入口：

1. 觀眾只在我們的頁面輸入搜尋關鍵字。
2. 按下搜尋時，前端把 query 傳到 Cloudflare Worker `/capture`。
3. 頁面立刻 `location.replace()` 到真正的 Google Images。
4. 觀眾後續看到與操作的都是真正 Google。
5. Worker `/latest` 可供之後魔術師端讀取最新 query。
6. Worker `/images?q=...` 可用 Brave Search 取得同人物的圖片，供之後 Mosaic 使用。

## 需要更新
- GitHub Pages：`index.html`, `app.js`, `styles.css`, `config.js`
- Cloudflare Worker：用 `worker/worker.js` 取代現有 Worker 程式
- Cloudflare Secret `BRAVE_API_KEY` 保持原樣，不需重設

## 注意
目前 `/latest` 使用 Worker 記憶體暫存，只適合概念驗證。正式跨裝置版本下一步會改用 Durable Object / KV / D1 或其他持久化 Session 儲存，避免 Worker instance 更換後資料遺失。
