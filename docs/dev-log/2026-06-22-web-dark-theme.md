# 前端改為深色主題

- 日期:2026-06-22
- 類型:feat / style
- 範圍:web

## 做了什麼

- 全域 `style.css` 設定深色基底:`color-scheme: dark`、body 底色 slate-950、預設文字淺色。
- 各頁面/元件(AppHeader、Login、Register、Dashboard、Devices)配色改為深色:
  - 背景 slate-950、卡片/面板 slate-900 + 邊框 slate-800。
  - 輸入框 slate-800 底、slate-700 邊、淺色文字、indigo-400 focus。
  - 表格分隔線 slate-800、表頭 slate-500、儲存格淺色文字。
  - 狀態 badge 改為半透明色塊(green/amber `/15`、slate-700);Dashboard 狀態卡同步。
  - Modal 遮罩加深(black/60),內容卡 slate-900。

## 為什麼這樣做

- 依需求將整體 UI 改為深色風格;以 `color-scheme: dark` 讓原生下拉/捲軸也呈深色,避免亮色殘留。
- 直接套深色色票(非 `dark:` 切換),因需求是固定深色而非主題切換。

## 影響範圍 / 後續注意事項

- 純前端樣式變更,push `apps/web/**` 觸發 Firebase Hosting 部署。
- 若日後要做亮/暗切換,可改用 Tailwind `dark:` 變體 + `html.dark` 切換。
