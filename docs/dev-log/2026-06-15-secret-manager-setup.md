# 設定環境變數管理:本機 .env 與 production Secret Manager

- 日期:2026-06-15
- 類型:chore / docs
- 範圍:api / db / deploy

## 做了什麼

- 建立 `apps/api/.env`(本機開發用,已被 `.gitignore` 忽略,不進版控),
  透過 Cloud SQL Auth Proxy 連線(`127.0.0.1:5432`)。
- 修正 `INSTANCE_CONNECTION_NAME` 中的 region 錯字:`asia-east-1` → `asia-east1`
  (GCP region 格式無中間連字號,錯字會導致 Auth Proxy 找不到實例)。
- 確立連線字串(`DATABASE_URL`)的兩套來源策略:
  - **本機**:從 `apps/api/.env` 讀取,走 Cloud SQL Auth Proxy。
  - **Production (Cloud Run)**:從 **Secret Manager** 注入,走 Unix socket
    (`host=/cloudsql/<INSTANCE_CONNECTION_NAME>`)。
- 整理 production 端使用 Secret Manager 的標準流程:
  1. 啟用 `secretmanager.googleapis.com`。
  2. 以 stdin 餵入方式建立 secret `database-url`(避免密碼留在 shell history)。
  3. 授予 Cloud Run service account `roles/secretmanager.secretAccessor`(最小權限)。
  4. 部署時以 `--set-secrets DATABASE_URL=database-url:latest` 注入,
     並以 `--add-cloudsql-instances` 掛載 Cloud SQL 實例。

## 為什麼這樣做

- 真實 production 憑證不應落地於 repo、Dockerfile 或 CI 明文設定;
  Secret Manager 提供集中保管、IAM 權限控管與存取稽核。
- 換密碼只需新增 secret 版本(`secrets versions add`),無需改 code 或重 build。
- 程式端(NestJS / Prisma)統一讀取 `process.env.DATABASE_URL`,
  本機與 production 共用同一支 code,僅來源不同,程式無感。
- 採最小權限原則:只授予 `secretAccessor`,不給專案層級的 owner/editor。

## 影響範圍 / 後續注意事項

- `apps/api/.env` 僅供本機,真實憑證一律只進 Secret Manager。
- 後續設定 GitHub Actions 部署時,CI 端憑證請改用 GitHub Actions Secrets /
  Workload Identity,同樣不得明文落地。
- 待辦:
  - 於 GCP 實際建立 `database-url` secret 並完成 IAM 授權。
  - 撰寫 Cloud Run 部署腳本 / CI workflow,串接 `--set-secrets` 與
    `--add-cloudsql-instances`。
  - 確認 Cloud Run 使用的 service account,並僅對其授權。