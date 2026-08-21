# Mosaic Magic Magician v0.6.0 — Mosaic Prototype

基準：v0.5.0-speed-test（已實機確認 4/4 Ready 0.89s）

本版只推進下一個核心驗證：
- 保留既有 `/latest` → `/images` → Brave 4 張候選流程
- 每張候選圖片 Ready 後，背景立即建立高速 Mosaic 測試圖
- 顯示 4 張圖片 Ready 時間與 4 張 Mosaic Ready 時間
- 點任一候選可比較「原始候選 / 高速 Mosaic」
- 可切換較粗 / 標準 / 較細格數，測人物辨識度
- 不修改 Spectator
- 不修改 Cloudflare Worker / Durable Object
- 尚未加入正式偽相簿、真實生活照、單張預覽、pinch zoom、Google emergency

測試重點：
1. 4/4 圖片 Ready 是否仍接近原本速度
2. 4/4 Mosaic Ready 總時間
3. 哪種格數最容易辨識人物
4. 候選 1~4 中，適合 Mosaic 的照片是否能一眼辨認
