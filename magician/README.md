# Mosaic Magic Magician v0.8.0 — Continuous Mosaic Gallery

核心架構重做：

- 真實照片只出現一次，不再 clone / 重複。
- 真實照片位於相簿前段，可點開單張預覽與左右切換。
- 真實照片之後直接接「Mosaic 素材區」。
- Mosaic 素材區以魔術師選定的 Brave 人物照片作為色彩/位置基底。
- 後段不是把人物圖突然蓋上去，而是大量獨立 micro thumbnails；每格顏色共同構成人物。
- pinch 改為連續 scale，跟著手指距離即時變化，不再 3/5/9 欄跳級。
- 縮小與放大完全可逆。
- 保留縮小/放大按鈕供桌面測試。
- Mosaic 細緻度沿用 v0.7.0 已確認的新基準。

本版仍是偽相簿互動原型。下一階段可依實機錄影微調：
1. Samsung Gallery 視覺細節
2. 真實照片區與 Mosaic 區交界的自然度
3. Mosaic micro-thumbnail 的照片感
4. pinch 慣性/中心點與效能
5. 真實照片持久保存
