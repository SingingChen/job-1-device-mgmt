# 初始化後端 apps/api:NestJS + Prisma scaffold

- 日期:2026-06-15
- 類型:chore
- 範圍:api / db

## 做了什麼

- 以官方 CLI scaffold 後端應用程式於 `apps/api`:
  - NestJS 11(`@nestjs/common` / `core` / `platform-express`),
    產生預設 `main.ts`、`app.module.ts`、`app.controller.ts`、`app.service.ts`。
  - TypeScript 5.7、ESLint 9 + Prettier、Jest(unit + e2e)測試設定。
- 初始化 Prisma 7(`prisma/schema.prisma`):
  - `generator client = prisma-client-js`
  - `datasource db` provider 為 **postgresql**,`url = env("DATABASE_URL")`。
  - `prisma.config.ts` 透過 `dotenv/config` 讀取環境變數。
- 新增 `apps/api/.env.example`(連線字串範本,含本機 Auth Proxy 與
  production Unix socket 兩種格式說明)。
- 新增 `apps/api/.gitignore`(忽略 `node_modules`、`.env`)。
- 移除 `apps/api/.gitkeep`(資料夾已有實際內容,佔位檔不再需要)。

## 為什麼這樣做

- 採官方 scaffold 取得社群慣例的專案結構與測試/lint 設定,降低後續維護成本。
- 確立 ORM 為 **Prisma**(非 TypeORM),與 CLAUDE.md 第 2 節技術棧一致。
- 連線字串以 `env("DATABASE_URL")` 外部化,本機讀 `.env`、production 由
  Secret Manager 注入,程式碼不綁定任何環境(參見
  `2026-06-15-secret-manager-setup.md`)。
- 目前僅保留 NestJS 預設的 `AppController` / `AppService`,尚未加入業務邏輯,
  待資料模型與 API 規格確認後再逐步擴充。

## 影響範圍 / 後續注意事項

- 尚未執行 `npm install`(`node_modules` 未建立),也尚未跑 `prisma generate` /
  `prisma migrate`。
- `schema.prisma` 目前無任何 model,後續需新增 `Device`、`User` 等資料模型,
  並建立第一份 migration。
- 待辦:
  - 定義 Prisma 資料模型(Device CRUD、User/Auth)。
  - 建立 `PrismaModule` / `PrismaService` 並接入 NestJS DI。
  - 規劃 JWT 驗證模組。
  - 撰寫 Dockerfile 與 Cloud Run 部署設定。