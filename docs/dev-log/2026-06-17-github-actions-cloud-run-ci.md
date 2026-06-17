# 建立 GitHub Actions:push 到 master 自動部署 Cloud Run

- 日期:2026-06-17
- 類型:ci
- 範圍:ci / deploy / api

## 做了什麼

- 新增 `.github/workflows/deploy-api.yml`:
  - 觸發條件:push 到 `master` 且改動到 `apps/api/**`(或手動 `workflow_dispatch`)。
  - 以 **Workload Identity Federation** 驗證(`id-token: write` + `google-github-actions/auth`),
    不存任何長期 SA 金鑰於 GitHub。
  - 流程:checkout → auth → `docker build`/`push` 到 Artifact Registry(tag 用 commit SHA)
    → `gcloud run deploy`,並串 `--add-cloudsql-instances`、
    `--set-secrets DATABASE_URL/JWT_SECRET`、`--set-env-vars JWT_EXPIRES_IN`。
  - 非機密設定(project、WIF provider、SA email、instance connection name)由 repo
    **Variables** 提供;機密只在 GCP Secret Manager。
- 新增 `apps/api/deploy/github-actions-wif-setup.md`:WIF 一次性設定指令(啟用 API、建
  Artifact Registry、兩個 SA 與最小權限、建立 WIF pool/provider 並綁定到本 repo、要填的
  repo Variables 清單、部署前 migrate deploy 步驟)。

## 為什麼這樣做

- **Workload Identity 取代金鑰**:延續 `2026-06-15-secret-manager-setup` 的既定策略,
  CI 憑證短期化、可稽核,杜絕長期金鑰外洩風險;`attribute-condition` 鎖定只有本 repo
  能假冒部署 SA。
- **部署 SA 與執行 SA 分離**:CI 用的部署 SA 只有 `run.admin` / `artifactregistry.writer` /
  對執行 SA 的 `actAs`;Cloud Run 執行 SA 只有 `secretAccessor` / `cloudsql.client`,
  彼此最小權限、互不擴權。
- **image tag 用 commit SHA**:每次部署可追溯到確切 commit,必要時可快速 rollback。
- **CI 不跑 migration**:沿用既定原則(production 用 `migrate deploy`、由 Auth Proxy 在
  部署前執行),避免多實例啟動競爭遷移。

## 影響範圍 / 後續注意事項

- 維持本機 `master` 為主分支並作為部署觸發分支(與 GitHub 預設 main 命名不同,已知並刻意保留)。
- 尚未實際串接:需先 (1) 建立遠端 repo 並 push、(2) 跑完 WIF 一次性設定、(3) 在 GitHub
  填好 repo Variables,workflow 才會成功。
- 首次部署前務必先 `prisma migrate deploy`,否則服務啟動後查詢會因 schema 不存在而失敗。
- `--allow-unauthenticated` 目前公開;若需內部存取再調整。
