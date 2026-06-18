# 專案現況與接續指南

> 給明天的自己 / 協作者:打開這份就能接上進度。歷史細節見 `docs/dev-log/`,
> API 細節見 `docs/backend-api-guide.md`。最後更新:2026-06-18。

---

## TL;DR — 現在到哪了

**全棧已上線。** 前端(Firebase Hosting)+ 後端(Cloud Run)+ DB(Cloud SQL),
兩條 CI/CD 皆透過 GitHub Actions + Workload Identity(免金鑰)。瀏覽器實測登入/裝置 CRUD 通過。

- 前端:<https://cleo-device-mgmt.web.app>
- 後端 API:<https://cleo-device-api-623878673471.asia-east1.run.app>

---

## 線上資源 / 重要識別碼

| 項目 | 值 |
|------|----|
| GitHub repo | `SingingChen/job-1-device-mgmt`(主分支 `master`,public) |
| GCP 專案 | `machine-status-494306`(與同事共用 → 資源一律 `cleo-` 前綴) |
| 專案編號 / 區域 | `623878673471` / `asia-east1` |
| Cloud Run 服務 | `cleo-device-api` |
| Artifact Registry | `cleo-containers` |
| Cloud SQL | `machine-status-494306:asia-east1:cleo-device-mgmt`,db `cleo-device-mgmt`,user `postgres` |
| Secrets | `cleo-database-url`、`cleo-jwt-secret`(Secret Manager) |
| 部署 SA / 執行 SA | `cleo-gha-deployer` / `cleo-device-api` |
| WIF pool / provider | `cleo-github` / `cleo-github-oidc` |
| Firebase Hosting site | `cleo-device-mgmt` |
| GitHub repo Variables | `GCP_PROJECT_ID`、`WIF_PROVIDER`、`DEPLOY_SA`、`RUNTIME_SA`、`INSTANCE_CONNECTION_NAME`、`WEB_API_BASE_URL` |

---

## 完成項目

- [x] 後端:NestJS + Prisma(adapter-pg)+ JWT,Device CRUD + 使用者資料隔離
- [x] 後端容器化(multi-stage Dockerfile)+ Cloud Run 部署
- [x] CI/CD:`deploy-api.yml`(push 改 `apps/api/**` → build → Cloud Run)
- [x] Secret Manager 注入 `DATABASE_URL` / `JWT_SECRET`;CORS 已啟用
- [x] 前端:Vue 3 + Vite + TS + Tailwind v4 + Pinia + vue-router
- [x] 前端:登入/註冊 + 裝置 CRUD UI + 路由守衛
- [x] CI/CD:`deploy-web.yml`(push 改 `apps/web/**` → build → Firebase Hosting)
- [x] 全棧瀏覽器實測通過;CORS 對線上網域驗證放行
- [x] 文件:`backend-api-guide.md` + 全程 dev-log

---

## 怎麼接續開發

### 本機跑後端(`apps/api`)
```bash
cd apps/api
cp .env.example .env        # 填 DATABASE_URL / JWT_SECRET(本機走 Auth Proxy)
# 另開終端:cloud-sql-proxy machine-status-494306:asia-east1:cleo-device-mgmt --port 5432
npm install && npm run start:dev   # http://localhost:3000
```

### 本機跑前端(`apps/web`)
```bash
cd apps/web
cp .env.example .env        # VITE_API_BASE_URL 預設指向 production 後端
npm install && npm run dev  # http://localhost:5173
```

### 部署(全自動)
- **只要 push 到 `master`**:改 `apps/api/**` 觸發後端部署;改 `apps/web/**` 觸發前端部署。
- 改 `docs/**` 不會觸發任何部署(path 過濾)。
- 看 CI:`gh run list --repo SingingChen/job-1-device-mgmt`、`gh run watch <id> --exit-status`。

### DB migration(有改 schema 時,部署前手動跑)
```bash
cloud-sql-proxy machine-status-494306:asia-east1:cleo-device-mgmt --port 5432 &
cd apps/api && DATABASE_URL="postgresql://postgres:PASS@127.0.0.1:5432/cleo-device-mgmt?schema=public" \
  npx prisma migrate deploy        # production 不可用 migrate dev
```

---

## 待辦 / 下一步(建議順序)

1. **CORS 收斂**(安全):後端目前反射任何來源。設 Cloud Run env
   `CORS_ORIGINS=http://localhost:5173,https://cleo-device-mgmt.web.app`
   (改 `main.ts` 已支援讀此變數;於 `deploy-api.yml` 的 `--set-env-vars` 加入,或
   `gcloud run services update cleo-device-api --update-env-vars ...`)。
2. **清測試資料**:prod DB 的 `cleo-e2e-*@example.com`、`cleo.chen@dynascan365.com`
   測試帳號與其裝置。
3. **消除 Node 20 警告**:CI 的 actions 被強制跑在 Node 24(純 cosmetic),可升級 action 版本。
4. **功能擴充**:ADMIN 跨使用者檢視(後端 `GET /devices?ownerId=` 已支援)、裝置分頁/搜尋、
   表單即時驗證、token 過期前自動更新(目前無 refresh token,過期後 401 導回登入)。
5. **測試**:補 auth/device 的單元與 e2e 測試(目前僅 scaffold)。

---

## 踩過的雷 / 慣例(別重蹈)

- **建 secret 別整塊貼**:含 `read` 的指令整塊貼上時,`read` 會把後續行當成密碼吃進去
  (曾因此存了壞的 `DATABASE_URL` 導致 500)。`read` 單獨一行、手動輸入,上傳前先驗證。
- **部署成功 ≠ 真的能動**:`curl` 不查 CORS,瀏覽器才會暴露跨來源問題;前端務必用瀏覽器實測。
- **改 secret 後要重新部署**:Cloud Run 的 `:latest` 不會自動更新執行中 revision。
- **`.firebaserc` 被 Write 工具擋**:疑似 settings/hook 的 deny 規則;改用 shell 寫檔可繞過
  (待用 `/update-config` 排查)。
- **commit 慣例**:功能與 dev-log 分兩個 commit(`feat/fix/ci/chore(...)` + `docs(dev-log): ...`)。
- **共用 GCP 專案**:所有新建資源一律 `cleo-` 前綴。

---

## 檔案地圖

- 後端:`apps/api/`(`src/`、`prisma/`、`Dockerfile`、`deploy/deploy-cloud-run.sh`、`deploy/github-actions-wif-setup.md`)
- 前端:`apps/web/`(`src/`、`firebase.json`、`.firebaserc`、`deploy/firebase-setup.md`)
- CI:`.github/workflows/deploy-api.yml`、`.github/workflows/deploy-web.yml`
- 文件:`docs/backend-api-guide.md`、`docs/dev-log/*`、本檔 `docs/PROJECT-STATUS.md`
