# Mosaic Magic — Magician v0.4.0

第一個魔術師端測試版。

## 目的
先驗證：
Spectator 輸入人名 → Cloudflare `/latest` → 魔術師手機收到 query → 自動抓人物圖片。

## 部署建議
把這五個檔案放到現有 GitHub repository 的 `magician/` 資料夾：

magician/
- index.html
- app.js
- styles.css
- config.js
- README.md

部署後網址：
https://vashyang1120.github.io/mosaic-magic-search/magician/

## 測試
先在魔術師手機開 magician 網址，保持畫面開啟。
再用另一支 Android 手機走 spectator v0.3.2 流程並搜尋人物。
如果成功，魔術師頁面約 1 秒內會顯示人物名稱與一張圖片。

`?debug=1` 可顯示完整狀態。

注意：目前 `/latest` 是 Cloudflare Worker 記憶體暫存，先用來驗證流程。若跨裝置偶發收不到，下一步會改成持久化 Session。
