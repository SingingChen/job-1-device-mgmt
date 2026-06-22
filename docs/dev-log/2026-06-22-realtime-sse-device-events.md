# 即時更新:裝置變更 SSE 推播

- 日期:2026-06-22
- 類型:feat
- 範圍:api / web

## 做了什麼

- **後端**:
  - 新增 `DeviceEventsService`(in-memory RxJS Subject)作為事件匯流排:`publish()` / `stream()`。
  - `DeviceService` 在 create / update / delete 後 `publish({ type, id, ownerId })`。
  - `DeviceController` 新增 `@Sse('events')` 端點:回傳該使用者相關的事件流
    (非 ADMIN 只收自己 `ownerId` 的事件)。因 `EventSource` 無法帶 Authorization header,
    JWT 改以 `?token=` query 傳入,於端點內用 `JwtService.verify` 驗證。
  - 守衛由 class 層改為逐方法 `@UseGuards(JwtAuthGuard)`(SSE 端點走自己的 token 驗證);
    `AuthModule` 匯出 `JwtModule`,`DeviceModule` 引入 `AuthModule` 以注入 `JwtService`。
- **前端**:
  - 新增 `useDeviceStream` composable:開 `EventSource(/devices/events?token=...)`,
    收到事件即呼叫回呼;`onUnmounted` 關閉連線。
  - `DashboardView` / `DevicesView`:初次載入照常(顯示 loading),SSE 事件到達時**靜默重抓**
    (`load(silent=true)`,不閃 loading);事件僅作為「失效通知」,前端重抓資料。

## 為什麼這樣做

- 需求是「資料真的變更才更新」,而非定時輪詢。SSE 是單向 server→client 推播,最貼合。
- 事件設計成「失效通知 + 前端重抓」,對未來換 Pub/Sub 的「至少一次、不保證順序」天生友善
  (重抓冪等)。
- **刻意把事件匯流排抽成 `DeviceEventsService`**:未來要跨 Cloud Run 實例 fan-out 時,
  只需把其內部換成 GCP Pub/Sub(`publish` → 發 topic、`stream` ← 每實例一個 subscription),
  `DeviceService` 與 SSE 端點不動。

## 影響範圍 / 後續注意事項

- **Cloud Run 限制**:in-memory 匯流排只通知連到同一實例的客戶端;多實例需 Pub/Sub(規劃中)。
- Cloud Run 請求逾時(預設 5 分鐘)會關閉長連線,`EventSource` 會自動重連;重連空窗期間的
  事件可能漏接(下次事件或操作後即同步,影響小)。
- `?token=` 會讓 JWT 出現在 URL(可能被記錄);demo 可接受,正式可改短效 SSE token 或 cookie。
- 後續:接 GCP Pub/Sub 取代 in-memory 匯流排,達成跨實例即時。
