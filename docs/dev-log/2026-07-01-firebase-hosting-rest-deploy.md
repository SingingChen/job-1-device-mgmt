# Web 部署改走 Hosting REST API(繞過 firebase-tools 的 WIF 認證問題)

- 日期:2026-07-01
- 類型:ci / fix
- 範圍:ci / web

## 做了什麼

`deploy-web.yml` 的 Firebase Hosting 部署步驟,從 `npx firebase-tools deploy` 改為呼叫自寫的 `apps/web/deploy/hosting-deploy.mjs`,直接打 Firebase Hosting REST API:

1. auth 步驟加 `token_format: access_token`(scope `cloud-platform`),用 WIF 換發短效 access token。
2. `hosting-deploy.mjs`(零依賴 Node script)用該 token 依序:建立 version(帶 SPA rewrite `** → /index.html`)→ `populateFiles`(送檔名→gzip 後 SHA-256 的清單)→ 上傳所需 gzip blob → finalize → release。
3. 每個 request 帶 `x-goog-user-project` header(quota project),並替部署 SA `cleo-gha-deployer` 加上 `roles/serviceusage.serviceUsageConsumer`(否則帶此 header 會 403 `USER_PROJECT_DENIED`)。

## 為什麼這樣做

- 這次推 master 後,`deploy-api` 成功但 `deploy-web` 失敗:`Error: Failed to authenticate, have you run firebase login?`。
- 排查:**同一個 `firebase-tools@13.35.1` 在 9 天前(06-22)是成功的**,且**這次 API 部署用同一套 WIF 認證也成功**——所以 WIF 憑證有效,問題出在 firebase-tools。
- 已知問題(firebase/firebase-tools#10726):firebase-tools 把 ADC 解析包在一個 hardcoded timeout 內,WIF(external_account)的 token 交換偶爾超時,就吞掉真正錯誤、丟出「have you run firebase login?」。而且它**不接受**預先換好的 bearer token(`GOOGLE_OAUTH_ACCESS_TOKEN` 不被採用)。
- 可選解法比較:
  - `FIREBASE_TOKEN`(deprecated 長效 refresh token)→ 違反本專案「免金鑰 WIF」原則,不採用。
  - Service account key → 同樣違反免金鑰原則。
  - **直接打 Hosting REST API + 短效 access token → 決定性、且維持免金鑰。採用此案。**
- REST script 先用本機 `gcloud auth print-access-token` 完整實測通過(含 SPA deep-link),才接進 CI。

## 影響範圍 / 後續注意事項

- 新增 IAM 綁定:部署 SA `cleo-gha-deployer` 多了 `roles/serviceusage.serviceUsageConsumer`(PROJECT-STATUS 已記)。
- 本機也可手動部署:`cd apps/web && npm run build && HOSTING_TOKEN=$(gcloud auth print-access-token) node deploy/hosting-deploy.mjs`(本機用 user 憑證,`x-goog-user-project` 為必要)。
- 若日後 firebase-tools 修好 #10726,可考慮改回官方 CLI;目前 REST 方式更穩、更快(部署約 17s)。
- 本次事件也讓 production 短暫處於「新後端 + 舊前端」不一致狀態(web CI 失敗期間),已用本機 REST script 手動補部署恢復。
