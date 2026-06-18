# 後端啟用 CORS(修正前端跨來源呼叫 Failed to fetch)

- 日期:2026-06-18
- 類型:fix
- 範圍:api

## 做了什麼

- 在 `apps/api/src/main.ts` 加入 `app.enableCors(...)`:
  - 預設 `origin: true`(反射請求來源);若設定環境變數 `CORS_ORIGINS`(逗號分隔)則
    僅允許清單內網域。
  - 使用 Bearer token(無 cookie),故不需 `credentials`。

## 為什麼這樣做

- 前端在不同來源(本機 `http://localhost:5173`、未來 Firebase Hosting 網域)呼叫
  Cloud Run 後端時,瀏覽器會發 CORS preflight;後端原本未啟用 CORS,導致瀏覽器擋下,
  前端顯示 `Failed to fetch`。
- 此問題用 `curl` 測不到(curl 不執行 CORS 檢查),只有真正用瀏覽器才會出現 —— 再次印證
  「工具能通 ≠ 瀏覽器能通」,需以實際前端驗證。

## 影響範圍 / 後續注意事項

- 需重新部署後端(push `apps/api/**` 觸發 GitHub Actions)。
- 待 Firebase Hosting 網域確定後,建議於 Cloud Run 設定 `CORS_ORIGINS` 收斂為
  「localhost(開發)+ 正式前端網域」,避免長期開放任意來源。
