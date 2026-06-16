# 實作 DeviceModule(Device CRUD API)

- 日期:2026-06-16
- 類型:feat
- 範圍:api

## 做了什麼

- 新增 `DeviceModule`,提供 Device 的 CRUD REST API(route prefix `/devices`):
  - `POST   /devices`        建立裝置(201)
  - `GET    /devices`        列表,支援 `?status=` 與 `?ownerId=` 過濾
  - `GET    /devices/:id`    查詢單一裝置
  - `PATCH  /devices/:id`    部分更新
  - `DELETE /devices/:id`    刪除(204)
- `DeviceService` 注入 `PrismaService` 執行查詢,並將 Prisma 錯誤轉成語意化的
  HTTP 例外:
  - `P2002`(unique)→ `409 Conflict`(serialNumber 重複)
  - `P2003`(FK)→ `400 Bad Request`(ownerId 不存在)
  - 查無資料 → `404 Not Found`
- DTO + 驗證(class-validator):
  - `CreateDeviceDto`:`name`、`serialNumber`(必填)、`status?`(enum)、
    `description?`、`ownerId`(必填)。
  - `UpdateDeviceDto`:`PartialType(CreateDeviceDto)`。
  - `ListDeviceQueryDto`:`status?`、`ownerId?` 查詢條件。
- `main.ts` 啟用全域 `ValidationPipe`:`whitelist`、`forbidNonWhitelisted`、
  `transform`(自動剝除未知欄位並拒絕含未知欄位的請求)。
- 新增依賴:`class-validator`、`class-transformer`、`@nestjs/mapped-types`。
- 端到端煙霧測試(對真實 Cloud SQL,測試資料用後即刪):建立 201、重複 409、
  錯誤 owner 400、驗證錯誤 400、列表/查詢 200、PATCH 200、查無 404、刪除 204,
  全數符合預期。

## 為什麼這樣做

- **錯誤映射**:直接讓 Prisma 例外冒泡會回 500;轉成 409/400/404 才能讓
  前端與 API 使用者得到正確語意。
- **ValidationPipe whitelist**:自動拒絕未知/惡意欄位,降低 over-posting 風險。
- **`ownerId` 暫由 client 傳入**:目前尚無 Auth,先讓 client 指定 owner 以打通
  CRUD;待 JWT 完成後改由 token 中的使用者身分帶入,並移除 DTO 的 `ownerId`。

## 影響範圍 / 後續注意事項

- ⚠️ **目前 API 完全未保護**——任何人都能呼叫且可指定任意 `ownerId`。這是暫時
  狀態,待 Auth 完成後須:
  1. 加上 JWT Guard 保護 `/devices`。
  2. 將 `ownerId` 從 `CreateDeviceDto` 移除,改用登入者身分。
  3. 查詢/更新/刪除時依擁有者做資料隔離(避免越權存取他人裝置)。
- 待辦:實作 Auth(User 註冊/登入、password 雜湊、JWT、Guard)。