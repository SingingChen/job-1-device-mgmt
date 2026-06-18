# 前端:登入/註冊流程 + 裝置 CRUD 介面

- 日期:2026-06-18
- 類型:feat
- 範圍:web

## 做了什麼

- 導入 **Pinia**,新增 `stores/auth.ts` 管理登入狀態:`login` / `register` / `logout`,
  並把 `token` 與 `user` 持久化到 `localStorage`(重整後維持登入)。
- `src/lib/api.ts` 強化為帶授權的 fetch wrapper:自動從 localStorage 取 JWT 加上
  `Authorization: Bearer`,並以 `ApiError`(含 `status`)拋出非 2xx,驗證錯誤的陣列訊息
  會合併為單一字串。
- `src/lib/devices.ts`:`list / create / update / delete` 對應後端 `/devices` 端點。
- 頁面:
  - `LoginView` / `RegisterView`:表單 + 錯誤顯示,成功後導向 `/devices`。
  - `DevicesView`:狀態篩選、新增表單、列表(狀態以顏色 badge 呈現)、編輯(modal)、
    刪除(confirm);遇到 401 自動登出並導回登入。
  - `components/AppHeader.vue`:顯示登入者 email 與登出鈕。
- 路由守衛:`requiresAuth` 未登入導向 `/login`;`public`(登入/註冊)已登入則導向 `/devices`;
  各頁改為動態 import(route-level code splitting)。
- `npm run build`(`vue-tsc` 型別檢查 + vite)通過。

## 為什麼這樣做

- Pinia + localStorage 是 Vue 3 管理 JWT 會話最直接、可重整保留的做法。
- token 注入放在 `api.ts` 單點處理,view/store 不需各自處理 header,降低重複。
- 將 401 視為「會話失效」統一導回登入,避免使用者卡在錯誤畫面。
- 動態 import 讓登入前不必載入裝置頁的程式碼,首屏更輕。

## 影響範圍 / 後續注意事項

- API base 仍由 `VITE_API_BASE_URL` 決定(預設 production);串接的端點對應
  `docs/backend-api-guide.md`。
- 目前未做 token 過期前的自動更新(無 refresh token);過期後下一次請求 401 會被導回登入。
- 後續可加:裝置分頁/搜尋、ADMIN 跨使用者檢視(後端已支援 `ownerId` 篩選)、表單即時驗證、
  以及部署到 Firebase Hosting 的設定與 CI。
