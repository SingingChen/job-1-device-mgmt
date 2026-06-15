# CLAUDE.md

本文件提供給 Claude Code 與所有協作者,作為本專案的開發規範與背景說明。任何 AI agent 或人類在進行開發前都應先閱讀本檔。

---

## 1. 專案目標

**Device 管理系統(Device Management System)**

提供裝置(Device)的集中管理能力,規劃涵蓋:

- 裝置的註冊、查詢、更新、刪除(CRUD)
- 裝置狀態與資訊的追蹤管理
- 使用者驗證與授權(JWT)
- 提供 Web 管理介面與後端 API

> 本專案以「展現專業、可重現的 AI agent 開發流程」為目標,強調清楚的規範、可追溯的開發紀錄與標準化的 commit 流程。

---

## 2. 技術棧

### 前端 `apps/web`
- **Vue 3**(Composition API)
- **Vite**(建置工具 / dev server)
- **TypeScript**

### 後端 `apps/api`
- **NestJS**(Node.js framework)
- **Prisma**(ORM) — ⚠️ **本專案一律使用 Prisma,禁止使用 TypeORM**
- **PostgreSQL**(資料庫)
- **JWT**(身分驗證)

### 部署與基礎設施
- **後端**:Docker 容器化 → 部署至 **GCP Cloud Run**
- **前端**:部署至 **Firebase Hosting**
- **資料庫**:**Cloud SQL (PostgreSQL)**
- **CI/CD**:**GitHub Actions**

---

## 3. Monorepo 資料夾結構

```
job-1-device-mgmt/
├── CLAUDE.md              # 本檔:專案規範與背景(開發前必讀)
├── .gitignore            # 版控忽略規則
├── apps/
│   ├── web/              # 前端:Vue 3 + Vite + TypeScript
│   └── api/              # 後端:NestJS + Prisma + PostgreSQL + JWT
└── docs/
    └── dev-log/          # 開發紀錄(每次重要變更需新增一篇)
```

| 路徑 | 用途 |
|------|------|
| `apps/web` | 前端應用程式 |
| `apps/api` | 後端 API 服務 |
| `docs/dev-log` | 開發歷程紀錄,作為決策與變更的可追溯來源 |

---

## 4. Commit 規範(Conventional Commits)

所有 commit 一律遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範。

### 格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 常用 type

| type | 用途 |
|------|------|
| `feat` | 新增功能 |
| `fix` | 修正 bug |
| `docs` | 文件變更(含 `docs/dev-log`) |
| `style` | 不影響邏輯的格式調整(空白、分號等) |
| `refactor` | 重構(非新功能、非修 bug) |
| `test` | 新增或調整測試 |
| `chore` | 雜項(建置流程、依賴更新、設定等) |
| `ci` | CI/CD 設定變更 |
| `perf` | 效能優化 |

### scope 建議

以受影響的範圍為 scope,例如:`web`、`api`、`db`、`ci`、`docker`、`auth`。

### 範例

```
feat(api): add device registration endpoint
fix(web): correct device status badge color
docs(dev-log): record initial monorepo setup
chore(api): add prisma and configure postgres connection
ci: add github actions workflow for api deploy
```

> 規則:subject 使用祈使句、英文小寫開頭、結尾不加句點。

---

## 5. 開發紀錄規則(重要)

**每次重要變更後,必須在 `docs/dev-log/` 新增一篇開發紀錄。**

「重要變更」包含但不限於:初始化專案、新增/調整套件、建立資料模型、新增 API、調整部署流程、重大重構、CI/CD 變更等。

### 檔名格式

```
docs/dev-log/YYYY-MM-DD-<簡短英文描述>.md
```

例:`docs/dev-log/2026-06-15-init-monorepo.md`

### 內容模板

```markdown
# <標題>

- 日期:YYYY-MM-DD
- 類型:feat / fix / docs / chore / ...
- 範圍:web / api / db / ci / ...

## 做了什麼
（本次變更的內容)

## 為什麼這樣做
（決策理由與取捨)

## 影響範圍 / 後續注意事項
（對其他模組、部署、資料庫的影響,或待辦事項)
```

> 開發紀錄本身的 commit 請使用 `docs(dev-log): ...`。
