# 建立 Dockerfile 與 Cloud Run 部署腳本

- 日期:2026-06-17
- 類型:chore / ci
- 範圍:api / deploy / docker

## 做了什麼

- 新增 `apps/api/Dockerfile`(multi-stage):
  - **builder**:`npm ci` → `npx prisma generate` → `npm run build` → `npm prune --omit=dev`。
  - **runner**:只帶 production `node_modules`(含已生成的 Prisma client)、`dist/`、
    `prisma/`、`prisma.config.ts`,以 `node:22-slim` 為基底,安裝 `openssl`(Prisma
    query engine 需要),並以非 root 的 `node` user 執行。
  - 啟動指令 `node dist/src/main`(對齊 `start:prod`;build 因 root config 使輸出落在
    `dist/src/`)。
- 新增 `apps/api/.dockerignore`:排除 `node_modules`、`dist`、`.env`、`test`、`*.spec.ts`
  等,縮小 build context 並確保密鑰不進 image。
- 新增 `apps/api/deploy/deploy-cloud-run.sh`:參數化的 build + 部署腳本,串接
  - `--add-cloudsql-instances`(Unix socket 掛載 Cloud SQL),
  - `--set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest`(Secret Manager 注入),
  - `--set-env-vars JWT_EXPIRES_IN=1d`,
  並在註解區保留「一次性設定」步驟(啟用 API、建 Artifact Registry、以 stdin 建 secret、
  授予 runtime SA `secretAccessor`、首次部署前以 Auth Proxy 跑 `prisma migrate deploy`)。

## 為什麼這樣做

- **Multi-stage** 讓最終 image 不含 devDependencies 與原始碼,體積小、攻擊面小。
- **不在 image / 腳本明文放憑證**:延續 `2026-06-15-secret-manager-setup` 的策略,
  `DATABASE_URL`、`JWT_SECRET` 一律由 Secret Manager 於部署時注入,程式端維持讀
  `process.env`,本機與 production 共用同一份 code。
- **migrate deploy 不放進容器啟動**:多實例同時啟動會競爭遷移;改為部署前由 CI / 本機
  透過 Auth Proxy 執行 `prisma migrate deploy`(production 禁用 `migrate dev`)。
- **非 root 執行 + openssl**:符合最小權限,並避免 Prisma 在 slim 基底缺少 openssl 而報錯。
- `main.ts` 已讀 `process.env.PORT` 並 `enableShutdownHooks()`,天然契合 Cloud Run 的
  動態 PORT 與 SIGTERM 回收。

## 影響範圍 / 後續注意事項

- 尚未實際 build / 推送 image,也未在 GCP 端建立 secret 與 IAM 授權;`deploy-cloud-run.sh`
  的「一次性設定」需先手動跑過一輪。
- 待辦:
  - 在 GCP 建立 Artifact Registry repo、`database-url` 與 `jwt-secret` secret 並授權 runtime SA。
  - 首次部署前以 Auth Proxy 執行 `prisma migrate deploy`。
  - 後續以 GitHub Actions 取代手動腳本(憑證改用 Workload Identity,不得明文落地)。
  - `--allow-unauthenticated` 目前為公開;若改為內部存取需調整。
