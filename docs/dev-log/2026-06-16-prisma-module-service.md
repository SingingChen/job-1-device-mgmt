# 建立 PrismaModule / PrismaService 並接入 NestJS

- 日期:2026-06-16
- 類型:feat
- 範圍:api / db

## 做了什麼

- 新增 `src/prisma/prisma.service.ts`:`PrismaService` 繼承 `PrismaClient`,
  實作 `OnModuleInit`($connect)與 `OnModuleDestroy`($disconnect),
  並在連線/斷線時輸出 log。
- 新增 `src/prisma/prisma.module.ts`:標記 `@Global()` 的 `PrismaModule`,
  provide 並 export `PrismaService`,讓任何 feature module 免重複 import 即可注入。
- `app.module.ts`:匯入 `ConfigModule.forRoot({ isGlobal: true })`(載入 `.env`
  至 `process.env`)與 `PrismaModule`。
- `main.ts`:呼叫 `app.enableShutdownHooks()`,確保 SIGTERM(如 Cloud Run 收回
  容器)時會觸發 `onModuleDestroy` 正常斷線。
- 新增依賴:
  - `@prisma/adapter-pg`、`pg`(Prisma 7 runtime 以 driver adapter 連線)
  - `@types/pg`(dev)
  - `@nestjs/config`(環境變數載入)
- 修正 `package.json` 的 `start:prod`:`node dist/main` → `node dist/src/main`
  (build 因 root `prisma.config.ts` 使 rootDir 上移,輸出實際在 `dist/src/`,
  原 script 會 fail,部署到 Cloud Run 必踩)。
- 實機驗證:啟動 Auth Proxy 後 `node dist/src/main` 啟動,log 出現
  `Connected to the database`,關閉時出現 `Disconnected from the database`;
  另驗證未設 `DATABASE_URL` 時 `PrismaService` 會如預期丟出明確錯誤。

## 為什麼這樣做

- **Prisma 7 driver adapter**:Prisma 7 runtime 不再用內建 engine 直連,需傳入
  adapter。故以 `PrismaPg({ connectionString: process.env.DATABASE_URL })` 建立
  連線;連線字串仍不寫死(本機由 `.env`,production 由 Secret Manager 注入)。
- **Global module**:DB 存取是橫切關注點,設為 global 可避免每個模組重複 import。
- **繼承 PrismaClient**:讓 `PrismaService` 直接擁有所有 query 方法,注入後即可
  `this.prisma.device.findMany(...)`,符合 NestJS 官方範式。
- **shutdown hooks**:雲端環境以 SIGTERM 回收容器,啟用後才能優雅關閉連線池。

## 影響範圍 / 後續注意事項

- `start:prod` 路徑已修正(見上)。後續若調整 build 輸出結構(讓 main 落在
  `dist/main`),記得同步更新此 script。
- `PrismaService` 可直接注入任何 service,下一步即可實作 Device CRUD。
- 待辦:
  - 實作 `DeviceModule`(CRUD)。
  - 實作 Auth(JWT)、password 雜湊。