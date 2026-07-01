# 裝置列表分頁 + 搜尋,新增儀表板統計端點

- 日期:2026-06-24
- 類型:feat
- 範圍:api / web

## 做了什麼

延續 `docs/PROJECT-STATUS.md` 待辦 #4「功能擴充」,實作裝置列表的**分頁與搜尋**,並為儀表板新增專用的**統計端點**。

**後端(`apps/api`)**
- `ListDeviceQueryDto`:新增 `search`、`page`、`pageSize`(數字以 `@Type(() => Number)` 轉型,`page ≥ 1`、`pageSize 1–100`)。
- `device.service.ts`:
  - `findAll` 改為分頁,回傳封包 `{ items, total, page, pageSize }`(原本是裸陣列)。`search` 以不分大小寫的子字串比對 `name` 與 `serialNumber`(`OR`)。`items` 與 `total` 以 `$transaction` 一致取得。
  - 新增 `stats(user, ownerId?)`:以 Prisma `groupBy` 在 DB 端聚合 `total / byStatus / byCategory`,加最新 5 筆 `recent`,不撈全表。
  - 抽出 `scopedWhere()` 統一資料隔離邏輯(USER 只看自己;ADMIN 可選 `ownerId`)。
- `device.controller.ts`:新增 `@Get('stats')`,**宣告在 `@Get(':id')` 之前**,避免 `stats` 被當成 id。

**前端(`apps/web`)**
- `types.ts`:新增 `DevicePage`、`DeviceStats`。
- `lib/devices.ts`:`listDevices` 接受 `search/page/pageSize` 並回傳封包;新增 `getDeviceStats()`。
- `DevicesView.vue`:加搜尋框(300ms debounce)、分頁控制(上一頁/下一頁、頁碼、`第 X–Y 筆,共 N 筆`);換篩選/搜尋時重置回第 1 頁;新增後跳第 1 頁;頁碼超出範圍時自動夾回(刪除後不會空頁);SSE 變更事件仍靜默重抓當前頁。
- `DashboardView.vue`:改用 `getDeviceStats()`,統計改由後端計算(原本是抓全部裝置在前端 reduce)。

**測試**
- `test/scenarios.mjs`:新增 D11–D15(分頁結構、`pageSize=1`、序號搜尋、不分大小寫搜尋、統計端點),共 26 項。
- 以 Docker Postgres + 本機 `start:prod` 實測:`PASS=26 FAIL=0`,並手動驗證分頁/搜尋/統計回應正確。

## 為什麼這樣做

- demo 資料已達 70+ 筆,列表一次撈全表既慢又難用;分頁 + 搜尋是最直接的體驗改善。
- 儀表板需要的是「全體聚合」而非「某一頁」。若沿用分頁的列表端點,前端只能拿到一頁、統計會錯;且為了統計而抓全表沒效率。因此另開 `GET /devices/stats`,用 DB 聚合一次算完。
- `findAll` 回傳改封包是必要的破壞性變更(要帶 `total` 才能算總頁數);因前後端同屬本 repo,一次改齊並更新文件即可。

## 影響範圍 / 後續注意事項

- **破壞性變更**:`GET /devices` 由裸陣列改為 `{ items, total, page, pageSize }`。任何外部呼叫端需改讀 `items`。`backend-api-guide.md` 已更新。
- 無 schema 變更,**不需要 DB migration**。
- 路由順序:`/devices/stats` 必須在 `/devices/:id` 之前註冊(已處理)。
- 部署後請跑 `npm run test:scenarios`(打 production)確認 D11–D15 通過;在部署前 prod 仍是舊行為,這幾項會是預期失敗。
- 後續可考慮:搜尋欄位擴及 `description`、ADMIN 在前端選 `ownerId`、列表欄位排序。
