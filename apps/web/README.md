# Web (前端)

Device Management 的前端,Vue 3 (Composition API) + Vite + TypeScript + Tailwind CSS。
部署目標:Firebase Hosting(後續設定)。

## 開發

```bash
npm install
cp .env.example .env   # .env 不進版控(repo 全域忽略),首次需自行複製
npm run dev            # http://localhost:5173
```

API base 由 `VITE_API_BASE_URL` 決定(見 `.env` / `.env.example`),預設指向已部署的
Cloud Run 後端;要打本機後端改成 `http://localhost:3000` 即可。後端 API 細節見
`docs/backend-api-guide.md`。

## 建置

```bash
npm run build      # vue-tsc 型別檢查 + vite build,輸出到 dist/
npm run preview    # 預覽 build 結果
```

## 現況

目前為 scaffold:已就緒的專案骨架、路由(單一首頁)、API base 設定,首頁提供一個
「測試後端連線」按鈕驗證串接。登入/註冊與裝置 CRUD 介面為後續迭代。
