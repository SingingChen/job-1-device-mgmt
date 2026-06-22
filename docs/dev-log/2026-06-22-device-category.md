# 裝置分類:新增 category 欄位

- 日期:2026-06-22
- 類型:feat
- 範圍:api / db / web

## 做了什麼

- **後端**:
  - `schema.prisma` 的 `Device` 新增 `category String?`(自由文字分類)與 `@@index([category])`。
  - 手寫 migration `20260622010000_add_device_category`(`ALTER TABLE ... ADD COLUMN` + 建索引)。
  - `CreateDeviceDto` / `ListDeviceQueryDto` 新增 `category`;`DeviceService.findAll` 支援
    `category` 篩選(create/update 透過 spread dto 自動帶入)。
- **前端**:
  - `types.ts` 的 `Device` / `DeviceInput` 加 `category`,並提供 `DEVICE_CATEGORIES` 建議清單。
  - `listDevices` 改為接受 `{ status, category }` 篩選。
  - `DevicesView`:新增/編輯表單加類別下拉、清單加「類別」欄、篩選列加「全部類別」下拉。

## 為什麼這樣做

- 對應主管需求中的「**分類**」—— 在既有的「狀態」之外,提供獨立的裝置類別維度。
- category 採自由文字(後端不限制),前端以建議清單下拉提供一致選項,兼顧彈性與體驗。
- migration 以離線手寫方式撰寫(`migrate diff` 需 shadow DB),欄位為 nullable、加法式變更,
  對既有資料安全。

## 影響範圍 / 後續注意事項

- **部署順序**:先以 Cloud SQL Auth Proxy 對 production 跑 `npx prisma migrate deploy`,
  再 push 觸發後端部署(後端新程式會查 `category` 欄位)。
- 既有裝置 `category` 為 NULL,UI 顯示「—」;demo 資料已另行回填類別。
- 後續可在 Dashboard 加「依類別統計」。
