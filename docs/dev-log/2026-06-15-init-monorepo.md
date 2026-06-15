# 初始化 Monorepo 結構與專案規範

- 日期:2026-06-15
- 類型:chore / docs
- 範圍:repo / web / api / docs

## 做了什麼

- 建立 monorepo 基礎資料夾結構:
  - `apps/web`(前端:Vue 3 + Vite + TypeScript,目前為空殼)
  - `apps/api`(後端:NestJS + Prisma + PostgreSQL + JWT,目前為空殼)
  - `docs/dev-log`(開發紀錄)
- 以 `.gitkeep` 保留尚未初始化的空資料夾。
- 執行 `git init` 初始化版本控制(預設分支 `master`)。
- 新增根目錄 `.gitignore`,忽略 `node_modules/`、`.idea/`、`.env` 等。
- 撰寫根目錄 `CLAUDE.md`,定義專案目標、技術棧、資料夾結構、Conventional Commits 規範,以及「每次重要變更需寫開發紀錄」的規則。
- 新增本篇開發紀錄,作為 dev-log 的範例模板。

## 為什麼這樣做

- 先確立規範與骨架、暫不寫業務功能,確保後續開發在一致的流程與結構下進行,展現可重現的 AI agent 開發流程。
- `apps/web`、`apps/api` 先保持空殼,待後續分別用官方 scaffold(`npm create vite` / `nest new`)初始化,避免過早產生大量樣板。
- 明確標註「ORM 使用 Prisma、禁止 TypeORM」,避免後續實作時選錯技術。

## 影響範圍 / 後續注意事項

- 尚未有任何業務程式碼與依賴安裝。
- 後續步驟(待確認):
  - 初始化 `apps/api`(NestJS + Prisma)
  - 初始化 `apps/web`(Vue 3 + Vite)
  - 設定 Docker、GitHub Actions、Cloud Run / Firebase Hosting 部署
- 第一個 commit 將涵蓋本次初始化內容,建議訊息:`chore: init monorepo structure and project conventions`。
