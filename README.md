# Mosaic Magic — Spectator Search Prototype v0.1

這是第一階段「觀眾端搜尋頁」測試版。

## 本版目的

先驗證：
1. 手機搜尋流程是否自然。
2. 圖片結果用手機三欄顯示是否合適。
3. 觀眾能否點圖、放大確認、再按「就選這張」。
4. 系統是否能保存 `query + selected image`。

## 注意

v0.1 的圖片來源目前是 demo 圖片，用來測完整 UI/UX 與選圖資料流。
下一版會把 `buildDemoResults()` 換成 Google Programmable Search 的正式圖片結果來源。

選定資料目前會：
- 存入 localStorage key: `mosaicMagicLastSelection`
- dispatch `mosaic-magic-selection` custom event
- 寫入 console 供開發測試

## 本機啟動

不要直接雙擊 index.html，建議用 HTTP server：

```bash
python3 -m http.server 8080
```

瀏覽器開：http://localhost:8080
