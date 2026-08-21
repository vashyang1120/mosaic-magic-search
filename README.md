# Mosaic Magic — Spectator Demo Fullscreen Handoff v0.3.1

## 新流程
1. 先顯示一個固定人物的完整「已搜尋圖片」頁面，預設是「周杰倫」。
2. 魔術師可以說：「我示範一下，像這樣搜尋一個人。」
3. 魔術師點搜尋框的那一下，頁面嘗試呼叫 Fullscreen API，並切換成乾淨輸入狀態。
4. 搜尋框自動清空並 focus，手機交給觀眾。
5. 觀眾輸入人物／角色名稱並送出。
6. 前端把 query POST 到 Cloudflare `/capture`。
7. 立刻 `location.replace()` 到真正 Google Images。
8. Google 頁面接手後，觀眾後續看到與操作的都是真的 Google。

## 更新方式
只需更新 GitHub Pages：
- index.html
- app.js
- styles.css
- config.js
- README.md

Cloudflare Worker 維持 v0.3.0 即可，不用重貼。

## 自訂示範人物
可在 config.js 修改：
- DEMO_QUERY
- DEMO_CHIPS

例如：
DEMO_QUERY: '周杰倫'
DEMO_CHIPS: ['演唱會','專輯','電影','近照']

## 注意
Fullscreen API 受手機瀏覽器支援限制。支援時，點搜尋框會隱藏瀏覽器 UI；不支援時會自動 fallback 成一般頁面切換，功能仍可使用。
