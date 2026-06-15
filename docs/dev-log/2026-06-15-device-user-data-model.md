# 定義 Device 與 User 資料模型

- 日期:2026-06-15
- 類型:feat
- 範圍:api / db

## 做了什麼

- 於 `prisma/schema.prisma` 新增兩個 model 與兩個 enum:
  - `User`:`id`(cuid)、`email`(unique)、`password`(hash)、`name`、
    `role`、`createdAt`、`updatedAt`,並持有 `devices Device[]`。
  - `Device`:`id`(cuid)、`name`、`serialNumber`(unique)、`status`、
    `description?`、`lastSeenAt?`、`owner`/`ownerId`、`createdAt`、`updatedAt`。
  - `enum Role { ADMIN, USER }`、`enum DeviceStatus { ONLINE, OFFLINE, MAINTENANCE }`。
- 建立 **User 1 : N Device** 關聯,`ownerId` 為必填外鍵,`onDelete: Restrict`。
- 為 `Device` 加上 `@@index([ownerId])` 與 `@@index([status])`。
- 修正 scaffold 帶來的潛在錯誤:Prisma 7 不再支援 `datasource` 區塊內的
  `url`,已移除該行(連線 URL 改由 `prisma.config.ts` 提供)。
- `npx prisma validate` 通過。

## 為什麼這樣做

- **關聯設計**:採 owner 關聯(每個裝置屬於某使用者),便於後續以 JWT 身分
  做資料隔離與權限過濾;`onDelete: Restrict` 避免誤刪仍持有裝置的使用者而
  造成孤兒資料,需先轉移或刪除其裝置。
- **enum 而非 string**:`role` 與 `status` 以 Prisma enum 取得型別安全與 DB
  層約束,避免應用層出現非法值。
- **cuid 主鍵**:不暴露遞增數量、利於分散式產生,符合 Prisma 慣例。
- **索引**:`ownerId`(依擁有者查詢)與 `status`(依狀態過濾)為預期高頻查詢。
- **password 欄位**:僅存 hash(bcrypt/argon2),嚴禁明文,已於 schema 註記。

## 影響範圍 / 後續注意事項

- 尚未建立 migration——需在 Cloud SQL Auth Proxy 連線後執行
  `npx prisma migrate dev --name init_device_user` 產生首份 migration 與 client。
- 後續實作 Auth 時,`password` 寫入前務必雜湊;查詢回傳 User 時應排除 `password`。
- 待辦:
  - 建立 `PrismaModule` / `PrismaService` 接入 NestJS DI。
  - 實作 Device CRUD 與 User/Auth(JWT)API。
  - 視需求補 `Device` 與使用者以外的關聯(如群組、標籤)。