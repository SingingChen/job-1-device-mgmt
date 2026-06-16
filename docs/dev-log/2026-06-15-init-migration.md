# 建立首份資料庫 migration(init_device_user)

- 日期:2026-06-15
- 類型:feat
- 範圍:api / db

## 做了什麼

- 透過 Cloud SQL Auth Proxy(`127.0.0.1:5432`)連到實例
  `machine-status-494306:asia-east1:cleo-device-mgmt`,執行
  `npx prisma migrate dev --name init_device_user`。
- 產生並套用首份 migration:
  `prisma/migrations/20260615091343_init_device_user/migration.sql`,內容包含:
  - `Role`、`DeviceStatus` 兩個 enum type。
  - `User`、`Device` 兩張表。
  - unique 索引:`User.email`、`Device.serialNumber`。
  - 一般索引:`Device.ownerId`、`Device.status`。
  - 外鍵:`Device.ownerId → User.id`,`ON DELETE RESTRICT ON UPDATE CASCADE`。
- Prisma 一併在實例上建立了 `cleo-device-mgmt` 資料庫(原先不存在),並重新
  產生 Prisma Client。
- 新增 `prisma/migrations/migration_lock.toml`(provider = postgresql)。

## 為什麼這樣做

- 以 `migrate dev` 建立可重現、可追蹤的 schema 變更歷史(migration 檔納入版控),
  讓任何環境都能用 `prisma migrate deploy` 套用相同結構。
- 連線採 Auth Proxy + Application Default Credentials,符合 CLAUDE.md 的本機
  開發方式,連線字串仍由 `.env` / `prisma.config.ts` 提供,未寫死於程式。

## 影響範圍 / 後續注意事項

- migration 已實際套用到 Cloud SQL 上的 `cleo-device-mgmt` 資料庫;後續變更
  schema 時請繼續以 `migrate dev` 產生新 migration,勿手動改表。
- 部署時(Cloud Run / CI)應改用 `npx prisma migrate deploy` 套用既有 migration,
  不要在 production 用 `migrate dev`。
- 本機操作需先啟動 Auth Proxy;proxy binary 目前位於 `~/cloud-sql-proxy`
  (不在 PATH),啟動指令見 `apps/api/.env` 註解。
- 待辦:建立 `PrismaModule` / `PrismaService` 接入 NestJS DI,開始實作 API。