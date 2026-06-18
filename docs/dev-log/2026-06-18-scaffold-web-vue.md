# Scaffold 前端 apps/web(Vue 3 + Vite + TS + Tailwind)

- 日期:2026-06-18
- 類型:chore
- 範圍:web

## 做了什麼

- 初始化前端骨架 `apps/web`:**Vue 3(Composition API)+ Vite 6 + TypeScript**。
- 樣式採 **Tailwind CSS v4**,以 `@tailwindcss/vite` plugin 接入,CSS 入口僅
  `@import "tailwindcss";`(v4 無需 tailwind.config / postcss 設定)。
- 加入 **vue-router**(目前單一首頁 `/`)與 `@` → `src` 路徑別名。
- API base 以 **`VITE_API_BASE_URL`** 設定,預設指向已部署的 Cloud Run 後端;提供
  `.env.example`,並在 `src/lib/api.ts` 放一個最小 fetch wrapper(供後續驗證/帶 token 用)。
- 首頁 `HomeView.vue` 提供「測試後端連線」按鈕(打後端 `GET /`)以驗證串接。
- 以 `npm run build`(`vue-tsc -b && vite build`)驗證型別檢查與打包皆通過。

## 為什麼這樣做

- 第一輪僅做 scaffold,先把可建置、可串接後端的骨架立起來,後續再加登入/裝置 CRUD。
- **API base 預設指向 production**:本機跑後端需先開 Cloud SQL Auth Proxy 較麻煩,而
  production 已上線且驗證過,前端開發直接打它最省事;要改打本機只需改一行 `.env`。
- Tailwind v4 設定最精簡,減少設定檔噪音。

## 影響範圍 / 後續注意事項

- `.env` 不進版控(repo 全域忽略 `.env`,僅保留 `.env.example`);clone 後需
  `cp .env.example .env`。
- 後續迭代:登入/註冊頁(存 JWT、加 Pinia 狀態管理)、裝置列表/新增/編輯/刪除 UI、
  路由守衛(未登入導向登入頁)、串接 `docs/backend-api-guide.md` 所列端點。
- 部署:之後設定 Firebase Hosting 與對應 CI(沿用 `cleo-` 命名約定於需要的 GCP/Firebase 資源)。
