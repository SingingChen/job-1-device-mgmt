# 後端完整指南(Device Management API)

> 本文件說明 `apps/api` 後端「在做什麼、提供哪些功能、如何測試」,作為前端開發與日常維運的對照手冊。
> 最後更新:2026-06-18。

---

## 1. 這個後端在做什麼

一個**裝置管理系統的後端 API**,提供:

- **使用者註冊 / 登入**,以 **JWT** 進行身分驗證。
- **裝置(Device)的 CRUD**:建立、查詢(列表 / 單筆)、更新、刪除。
- **資料隔離**:一般使用者只能看到/操作自己擁有的裝置;管理員(ADMIN)可跨使用者管理。

技術棧:**NestJS 11** + **Prisma 7**(透過 `@prisma/adapter-pg` driver adapter)+ **PostgreSQL**(Cloud SQL)+ **JWT**。
部署:Docker → **GCP Cloud Run**,DB 為 **Cloud SQL**,密鑰由 **Secret Manager** 注入,CI/CD 為 **GitHub Actions(Workload Identity)**。

**Base URL**
- 本機:`http://localhost:3000`
- Production:`https://cleo-device-api-623878673471.asia-east1.run.app`

---

## 2. 架構與模組

```
src/
├── main.ts                 # bootstrap:全域 ValidationPipe、enableShutdownHooks、listen(PORT)
├── app.module.ts           # 根模組:ConfigModule(global) + Prisma/Auth/Device
├── app.controller.ts       # GET /  健康/問候字串
├── prisma/
│   ├── prisma.service.ts   # PrismaClient 包成 Nest provider,用 DATABASE_URL 建 PrismaPg adapter
│   └── prisma.module.ts
├── auth/
│   ├── auth.controller.ts  # /auth/register, /auth/login, /auth/me
│   ├── auth.service.ts     # bcrypt 雜湊、簽發 JWT
│   ├── strategies/jwt.strategy.ts   # 驗 token + 重新載入 user(被刪帳號的 token 會被拒)
│   ├── guards/jwt-auth.guard.ts     # AuthGuard('jwt')
│   ├── decorators/current-user.decorator.ts  # @CurrentUser() 注入登入者
│   └── dto/                # register / login DTO(class-validator)
└── device/
    ├── device.controller.ts # /devices CRUD,整個 controller 掛 JwtAuthGuard
    ├── device.service.ts    # 業務邏輯 + 擁有者隔離 + Prisma 錯誤轉譯
    └── dto/                 # create / update / list-query DTO
```

全域設定(`main.ts`):

- **ValidationPipe**:`whitelist`(移除未宣告欄位)、`forbidNonWhitelisted`(送多餘欄位直接 400)、`transform`(自動轉型)。
- **enableShutdownHooks()**:收到 SIGTERM(Cloud Run 回收容器)時正常斷開 Prisma 連線。
- **PORT**:讀 `process.env.PORT`,預設 3000(Cloud Run 會注入 8080)。

---

## 3. 資料模型(Prisma schema)

### Enums
- `Role`:`ADMIN` | `USER`
- `DeviceStatus`:`ONLINE` | `OFFLINE` | `MAINTENANCE`

### User
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String (cuid) | PK |
| `email` | String, unique | 登入帳號 |
| `password` | String | bcrypt 雜湊(永不回傳) |
| `name` | String | 顯示名稱 |
| `role` | Role | 預設 `USER` |
| `devices` | Device[] | 擁有的裝置 |
| `createdAt` / `updatedAt` | DateTime | 時間戳 |

### Device
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String (cuid) | PK |
| `name` | String | 裝置名稱 |
| `serialNumber` | String, unique | 序號(全域唯一) |
| `status` | DeviceStatus | 預設 `OFFLINE` |
| `category` | String? | 裝置類別(自由文字,可選),用於分類 |
| `description` | String? | 選填 |
| `lastSeenAt` | DateTime? | 最後回報時間(目前未自動更新) |
| `owner` / `ownerId` | User 關聯 | 擁有者;`onDelete: Restrict`(還有裝置的 user 不可被刪) |
| `createdAt` / `updatedAt` | DateTime | 時間戳 |

索引:`@@index([ownerId])`、`@@index([status])`。

---

## 4. 身分驗證與授權

### 流程
1. `POST /auth/register` 或 `POST /auth/login` → 取得 `accessToken`(JWT)。
2. 後續呼叫受保護的端點時帶 header:`Authorization: Bearer <accessToken>`。
3. `JwtStrategy` 驗證簽章與過期後,**會用 token 的 `sub` 重新查 DB 載入使用者**(所以被刪除的帳號、其舊 token 會被拒絕),並把 `{ id, email, role }` 掛到 `request.user`。

### JWT 內容
- Payload:`{ sub: userId, email, role, iat, exp }`
- 簽章密鑰:環境變數 `JWT_SECRET`;有效期:`JWT_EXPIRES_IN`(預設 `1d`)。

### 授權 / 資料隔離規則(在 `device.service.ts`)
- **USER**:`findAll` 只回自己的裝置;`findOne/update/remove` 只能操作自己的裝置,**他人的裝置一律當成 404**(不洩漏存在與否)。
- **ADMIN**:`findAll` 可用 `ownerId` 篩選特定使用者,不帶則看到全部;可存取任何裝置。

### 密碼處理
- 以 **bcrypt**(salt rounds = 10)雜湊;密碼長度上限 72 bytes(bcrypt 限制)。
- 登入失敗一律回 `Invalid credentials`(不分「帳號不存在」或「密碼錯」,避免帳號探測)。

---

## 5. API 參考

> 除特別標註,請求/回應皆為 `application/json`。🔒 = 需帶 `Authorization: Bearer <token>`。

### 健康檢查
| Method | Path | 說明 |
|--------|------|------|
| GET | `/` | 回傳純文字問候字串,可當基本 liveness 檢查 |

### Auth
#### `POST /auth/register` — 註冊
Body:
```json
{ "email": "user@example.com", "password": "至少8碼", "name": "顯示名稱" }
```
- 201:`{ "accessToken": "...", "user": { "id", "email", "name", "role" } }`
- 400:欄位驗證失敗(email 格式、password < 8、name 空…)
- 409:`Email already registered`(email 已存在)

#### `POST /auth/login` — 登入
Body:`{ "email": "...", "password": "..." }`
- 200:`{ "accessToken": "...", "user": { ... } }`
- 401:`Invalid credentials`

#### `GET /auth/me` 🔒 — 取得目前登入者
- 200:`{ "id", "email", "role" }`(注意:不含 name)
- 401:無 token / token 失效 / 帳號已刪

### Devices(整個 `/devices` 都需登入 🔒)
#### `POST /devices` — 建立裝置
Body:
```json
{ "name": "Sensor A", "serialNumber": "SN-001", "status": "ONLINE", "category": "感測器", "description": "選填" }
```
（`status`、`category`、`description` 選填;`status` 不給預設 `OFFLINE`）
- 201:回傳建立的 Device(含 `ownerId` = 目前使用者)
- 400:驗證失敗
- 409:`serialNumber` 已存在

#### `GET /devices` — 列出裝置
Query(皆選填):
- `status`:`ONLINE|OFFLINE|MAINTENANCE`
- `category`:依類別篩選(精確比對)
- `ownerId`:**僅 ADMIN 有效**(USER 一律只看自己的)
- 200:Device 陣列(依 `createdAt` 由新到舊)

#### `GET /devices/:id` — 取得單筆
- 200:Device
- 404:不存在,或不屬於你(USER)

#### `PATCH /devices/:id` — 更新(部分欄位)
Body:CreateDeviceDto 的任意子集(全部選填)
- 200:更新後的 Device
- 404:不存在/非擁有者
- 409:改成已存在的 `serialNumber`

#### `DELETE /devices/:id` — 刪除
- 204:成功(無回應 body)
- 404:不存在/非擁有者

#### `GET /devices/events?token=<JWT>` — 即時事件(SSE)
- Server-Sent Events 串流(`text/event-stream`),用於即時更新。
- 認證:`EventSource` 無法帶 `Authorization` header,故 JWT 以 **query 參數 `token`** 傳入,於端點內驗證。
- 推送內容:該使用者相關的裝置變更事件 `{ "type": "created|updated|deleted", "id", "ownerId" }`
  (非 ADMIN 只收自己 `ownerId` 的事件)。事件為「**失效通知**」—— 前端收到後重抓 `GET /devices`。
- 架構細節見下節。

### 錯誤回應格式(NestJS 標準)
```json
{ "statusCode": 400, "message": ["email must be an email"], "error": "Bad Request" }
```
`message` 可能是字串或字串陣列(驗證錯誤時為陣列)。

---

## 5.5 即時更新架構(SSE + Pub/Sub)

裝置變更會即時反映到開著的前端,不需手動重新整理。系統有**兩條獨立的路**:

**① 寫入路徑(資料本身,request/response)**
```
瀏覽器 / seed → POST·PATCH·DELETE /devices → DeviceController → DeviceService
            → Prisma → Cloud SQL(資料真正寫在這)→ 回傳結果
```

**② 即時通知路徑(只傳「有東西變了」的輕量訊號)**
```
DeviceService 寫完 DB → events.publish({type,id,ownerId})
   → GCP Pub/Sub topic「cleo-device-events」
   → Pub/Sub 廣播給「每個後端實例各自的 subscription」
   → 各實例推進自己的 RxJS Subject → @Sse('events') 推給該實例連著的瀏覽器
   → 瀏覽器 EventSource 收到 → 靜默重抓 GET /devices → 畫面更新
```

### Pub/Sub 與 SSE 的分工(兩者互補、缺一不可)

| 元件 | 負責路段 | 為什麼需要 |
|------|----------|-----------|
| **GCP Pub/Sub** | 後端實例 ↔ 後端實例(server→server) | 把「有變更」廣播到**每一個**後端實例。瀏覽器的 SSE 可能連在實例 A,但變更由實例 B 處理;in-memory 匯流排跨不了 process,所以需要共用匯流排 |
| **SSE** | 後端實例 → 瀏覽器(server→browser) | 最後一哩,真正把通知推進開著的網頁。瀏覽器無法直接連 Pub/Sub(無 client、需 GCP 憑證) |

> 比喻:Pub/Sub 是各分店間的內部廣播;SSE 是分店打給客戶的電話。要讓「某處發生的事」傳到「特定客戶」,兩者都要。

### 回退與設定
- **未設 `PUBSUB_TOPIC`(本機 / 單實例)**:略過 Pub/Sub,in-memory Subject 直接餵 SSE。
  Pub/Sub 只在「多實例 / 多環境」才發揮價值。
- Pub/Sub 初始化失敗(topic/權限未備)會**自動回退 in-memory**,不會讓 API 啟動失敗。
- 實作位置:`apps/api/src/device/device-events.service.ts`(`publish`/`stream` + 每實例專屬 subscription)、
  `device.controller.ts`(`@Sse('events')`)、前端 `apps/web/src/lib/useDeviceStream.ts`。
- Cloud Run 注意:請求逾時(預設 5 分鐘)會關閉 SSE 長連線,`EventSource` 會自動重連;Pub/Sub 免費額度足夠。

---

## 6. 本機開發

### 前置
- Node.js(專案以 Node 22/24 驗證過)、npm。
- 一個 PostgreSQL(本專案用 Cloud SQL,經 **Cloud SQL Auth Proxy** 連線)。

### 設定環境變數
複製 `apps/api/.env.example` → `apps/api/.env`,填入:
- `DATABASE_URL`(本機走 proxy:`postgresql://USER:PASS@127.0.0.1:5432/DB?schema=public`)
- `JWT_SECRET`(`openssl rand -hex 32`)、`JWT_EXPIRES_IN`(如 `1d`)

### 啟動(在 `apps/api/`)
```bash
npm install
# 若連 Cloud SQL,另開終端啟動 proxy:
#   cloud-sql-proxy <INSTANCE_CONNECTION_NAME> --port 5432
npx prisma migrate deploy   # 套用既有 migration(本機初次)
npm run start:dev           # 開發模式(watch),預設 http://localhost:3000
```

其他常用 script:`npm run build`、`npm run start:prod`(`node dist/src/main`)、`npm run lint`。

---

## 7. 如何測試

### 7.1 自動化測試(Jest)
在 `apps/api/`:
```bash
npm run test       # 單元測試(*.spec.ts)
npm run test:e2e   # e2e 測試(test/ 目錄,需可用的測試環境)
npm run test:cov   # 覆蓋率
```
> 目前測試檔為 scaffold 起步(`app.controller.spec.ts`、`test/app.e2e-spec.ts`),擴充 auth/device 測試是後續可做的項目。

### 7.2 手動測試(curl 完整 round-trip)
可對本機(`http://localhost:3000`)或 production URL 執行。以下示範對 production:

```bash
URL="https://cleo-device-api-623878673471.asia-east1.run.app"
EMAIL="demo-$(date +%s)@example.com"

# 1) 註冊
curl -s -X POST "$URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234!\",\"name\":\"Demo\"}"

# 2) 登入並取出 token(需要 jq;或手動複製 accessToken)
TOKEN=$(curl -s -X POST "$URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234!\"}" | jq -r .accessToken)

# 3) 目前登入者
curl -s "$URL/auth/me" -H "Authorization: Bearer $TOKEN"

# 4) 建立裝置
curl -s -X POST "$URL/devices" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sensor A","serialNumber":"SN-001","status":"ONLINE"}'

# 5) 列出裝置(可加 ?status=ONLINE)
curl -s "$URL/devices" -H "Authorization: Bearer $TOKEN"

# 6) 未帶 token 應回 401
curl -s -o /dev/null -w "%{http_code}\n" "$URL/devices"
```

預期:1→201、2 取得 token、3→200、4→201、5→200(含剛建立的裝置)、6→401。

### 7.3 驗證重點清單
- [ ] 註冊重複 email → 409
- [ ] 登入錯密碼 → 401 `Invalid credentials`
- [ ] 無 / 過期 token 打 `/devices` → 401
- [ ] USER A 無法 `GET /devices/:id` 取得 USER B 的裝置 → 404
- [ ] 重複 `serialNumber` 建立 → 409
- [ ] 送出未宣告欄位 → 400(`forbidNonWhitelisted`)

---

## 8. 部署摘要

- 推送到 `master` 且改動 `apps/api/**` → 觸發 `.github/workflows/deploy-api.yml`。
- 流程:build image → 推 Artifact Registry(`cleo-containers`)→ deploy Cloud Run 服務 `cleo-device-api`,掛 Cloud SQL socket 並由 Secret Manager 注入 `DATABASE_URL` / `JWT_SECRET`。
- DB migration **不在 CI 執行**,需部署前以 Auth Proxy 跑 `npx prisma migrate deploy`。
- 詳細決策與踩雷見 `docs/dev-log/`(特別是 `2026-06-18-first-cloud-run-deploy-via-github-actions.md`)。

---

## 9. 已知行為 / 注意事項

- `GET /auth/me` 回傳不含 `name`(只有 `id/email/role`);登入/註冊回傳的 `user` 才含 `name`。
- `lastSeenAt` 欄位存在但目前沒有自動更新邏輯(預留給未來的心跳/狀態回報)。
- `serialNumber` 為**全域唯一**(非「每位使用者唯一」)。
- 變更 Secret Manager 的值後,執行中的 Cloud Run revision 不會自動更新,需重新部署一版。
- 即時更新為「事件通知 + 前端重抓」(Pub/Sub→SSE);裝置資料本身仍以 REST(`GET /devices`)為準。
