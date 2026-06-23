# 即時事件匯流排改用 GCP Pub/Sub

- 日期:2026-06-22
- 類型:feat / refactor
- 範圍:api / deploy

## 做了什麼

- `DeviceEventsService` 內部由 in-memory RxJS Subject 改為 **GCP Pub/Sub**(`@google-cloud/pubsub`):
  - `onModuleInit`:若有 `PUBSUB_TOPIC`,建立**本實例專屬的 subscription**(`<topic>-<uuid>`,
    含 `expirationPolicy` TTL 自動清孤兒),收到訊息推進 `Subject`。
  - `publish()`:發訊息到 topic;**不**同時推 `Subject`(自己的 subscription 會收到自己發的,避免重複)。
  - `stream()`:維持不變。
  - `onModuleDestroy`:刪除 subscription、關閉 client(SIGTERM 時觸發)。
  - **回退**:未設 `PUBSUB_TOPIC`、或 Pub/Sub 初始化失敗 → 回退 in-memory,**不讓 Pub/Sub 問題弄垮 API**。
- `DeviceService` 與 SSE 端點(`device.controller.ts`)**完全未動**(當初抽象化的回收)。
- `.github/workflows/deploy-api.yml`:Cloud Run `--set-env-vars` 加 `PUBSUB_TOPIC=cleo-device-events`。
- `.env.example`:新增 `PUBSUB_TOPIC`(本機留空=in-memory;填值=真 Pub/Sub,需 ADC)。

## 為什麼這樣做

- in-memory 匯流排只在單一 process 內有效:雲端 `seed` 的變更本機 SSE 收不到,多實例也只推同一實例。
- Pub/Sub 作為共用匯流排 + **每實例一個 subscription**,任一後端發出的變更會 fan-out 給所有實例的 SSE 聽眾,
  達成跨實例 / 跨環境即時。
- 事件維持「失效通知 + 前端重抓」,對 Pub/Sub 至少一次/不保證順序天生友善。

## 影響範圍 / 後續注意事項

- **需先做 GCP 設定**(建 topic `cleo-device-events` + 授 runtime SA `roles/pubsub.editor`)再部署;
  因有回退保護,即使順序顛倒也不會讓服務啟動失敗(只是暫無跨實例 fan-out)。
- 跨實例 fan-out 可暫時 `--min-instances=2` 並用兩個視窗驗證。
- Pub/Sub 免費額度足夠;`?token=` SSE 認證方式不變。
