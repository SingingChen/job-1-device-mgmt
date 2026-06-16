# 實作 JWT Auth 並保護 Device API

- 日期:2026-06-16
- 類型:feat
- 範圍:api / auth

## 做了什麼

### Auth(`AuthModule`)
- `POST /auth/register`:建立使用者,以 **bcrypt**(salt rounds 10)雜湊密碼,
  回傳 access token 與使用者資訊。重複 email → `409 Conflict`。
- `POST /auth/login`:驗證 email/password,成功回傳 token;失敗一律回
  `401 Invalid credentials`(不透露 email 是否存在)。
- `GET /auth/me`:受保護,回傳目前登入者。
- `JwtStrategy`(passport-jwt):從 `Authorization: Bearer` 取 token,驗章與
  過期後再以 `sub` 重新查 DB,確保帳號仍存在且 role 為最新。
- `JwtAuthGuard`、`@CurrentUser()` 參數裝飾器、`AuthUser` 型別。
- `JwtModule.registerAsync`:secret 與 `expiresIn` 由 `ConfigService` 讀取
  (`JWT_SECRET`、`JWT_EXPIRES_IN`)。
- DTO 驗證:`RegisterDto`(email 格式、password 8–72 字、name)、`LoginDto`。

### 保護 Device API
- `DeviceController` 整體掛上 `@UseGuards(JwtAuthGuard)`,未帶有效 token → `401`。
- 從 `CreateDeviceDto` 移除 `ownerId`;建立裝置時 owner 一律取自登入者
  (`@CurrentUser().id`),client 無法指定他人為 owner。
- `DeviceService` 改為「擁有者感知」:
  - 一般使用者僅能查/改/刪自己的裝置;`ADMIN` 可存取全部、並可用
    `?ownerId=` 過濾。
  - 跨擁有者存取一律回 `404`(而非 403),避免洩漏他人裝置是否存在。

### 環境變數
- `.env` / `.env.example` 新增 `JWT_SECRET`、`JWT_EXPIRES_IN`(`.env` 為本機值、
  不進版控;production 由 Secret Manager 注入)。

### 新增依賴
- `@nestjs/jwt`、`@nestjs/passport`、`passport`、`passport-jwt`、`bcrypt`
  (與對應 `@types`)。

## 為什麼這樣做

- **passport-jwt + Guard**:NestJS 官方範式,Guard 可逐 controller/route 套用,
  日後要做 RBAC 也能在此延伸。
- **strategy 內重查 DB**:讓「已刪帳號的舊 token」失效、role 不會因 token 內
  夾帶而過期,安全性優於純信任 payload。
- **owner 取自 token**:杜絕 client 偽造 `ownerId`,是資料隔離的根本。
- **跨擁有者回 404**:避免以狀態碼差異探測他人資源是否存在。
- **登入失敗統一訊息**:降低帳號列舉(user enumeration)風險。

## 影響範圍 / 後續注意事項

- 端到端驗證(對真實 Cloud SQL,測試帳號用後即刪):註冊/重複 409/弱密碼 400/
  登入錯誤 401/無 token 401/me 200/建立裝置(owner 自動帶入)201/夾帶 ownerId
  400/B 看不到 A 的裝置([]、404)/A 仍可存取自己的裝置 —— 全數符合預期。
- 目前所有人註冊後皆為 `USER`;尚無建立 `ADMIN` 的流程(可日後加 seed 或
  管理端點)。`ADMIN` 的全域存取邏輯已實作,但尚無 admin 帳號可測。
- 尚未加上 refresh token / 登出機制;token 為單一短期 access token。
- 待辦:前端串接登入流程;視需求加 RBAC(`@Roles()`)、refresh token。