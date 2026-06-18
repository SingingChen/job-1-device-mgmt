# 首次經由 GitHub Actions 成功部署至 Cloud Run(含 Secret 踩雷紀錄)

- 日期:2026-06-18
- 類型:ci / fix
- 範圍:deploy / ci / db

## 做了什麼

- 完成 GCP 端一次性設定(全部資源加 `cleo-` 前綴,共用專案):
  - 啟用 API、建 Artifact Registry repo `cleo-containers`。
  - 建兩個 Service Account:`cleo-gha-deployer`(CI 部署用)、`cleo-device-api`(執行用),
    並依最小權限授權(`run.admin` / `artifactregistry.writer` / `serviceAccountUser`;
    執行 SA 給 `cloudsql.client` 與兩個 secret 的 `secretAccessor`)。
  - 建 Secret Manager:`cleo-database-url`、`cleo-jwt-secret`。
  - 建 Workload Identity pool/provider(`cleo-github` / `cleo-github-oidc`),
    以 `attribute-condition` 鎖定僅 `SingingChen/job-1-device-mgmt` 可假冒部署 SA。
- 以 `gh` 設定 repo Variables(`GCP_PROJECT_ID`、`WIF_PROVIDER`、`DEPLOY_SA`、
  `RUNTIME_SA`、`INSTANCE_CONNECTION_NAME`)。
- push 到 `master` 觸發 `.github/workflows/deploy-api.yml`,完成 build → push image →
  deploy 到 Cloud Run(服務 `cleo-device-api`,掛 Cloud SQL socket + 注入 secret)。
- 端對端驗證 production:`register` → `login` 取 token → `/auth/me` → 建立 device →
  列出 device → 無 token 被擋(401)全數通過。

## 為什麼這樣做

- 驗證整條免金鑰 CI/CD(GitHub OIDC → WIF → Cloud Run)實際可運作,而非只到「部署成功」。
- 部署成功不等於服務正常:必須打到 DB 的請求才驗得出連線設定是否正確。

## 影響範圍 / 後續注意事項

- **踩雷:secret 值被汙染**。首次部署後 `login` 回 500,日誌為 `ERR_INVALID_URL`
  (`prisma.user.findUnique` → `Invalid URL`)。根因不是程式,而是建 `cleo-database-url`
  時「將含 `read` 的多行指令整塊貼上」,`read` 把後續行也當成密碼讀入,存進了一段
  ~800 字元的壞連線字串。
  - **修法**:`read` 一律單獨一行執行、手動輸入;上傳前先以 `new URL()` 驗證結構
    (印 user / passLen / host / hostParam,不印密碼);確認無誤再
    `gcloud secrets versions add` 寫新版本,並 `gcloud run services update
    --update-secrets DATABASE_URL=cleo-database-url:latest` 重新部署一版套用。
  - **教訓**:凡是含 `read` 的步驟,文件/指令都應拆成「單行貼上」,避免 here-paste 汙染。
- Cloud Run 的 `:latest` secret 不會自動更新執行中 revision,改密碼/連線字串後需重新部署一版。
- GitHub Actions 出現 Node 20 deprecation 警告(checkout / auth / setup-gcloud 被強制跑在
  Node 24),不影響部署,後續可升級 action 版本消除警告。
- production DB 留有一筆 e2e 測試資料(user `cleo-e2e-1781765929@example.com` 及其 device),
  視需要清除。
- 服務網址:`https://cleo-device-api-623878673471.asia-east1.run.app`。
