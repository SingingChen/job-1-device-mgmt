# 前端部署:Firebase Hosting + GitHub Actions CI

- 日期:2026-06-18
- 類型:ci
- 範圍:web / ci / deploy

## 做了什麼

- 新增 `apps/web/firebase.json`:Hosting 設定,`public: dist`、SPA rewrites(所有路徑回
  `/index.html`),並以 `site: "cleo-device-mgmt"` 指定 Hosting site。
- 新增 `.github/workflows/deploy-web.yml`:push 到 `master` 且改動 `apps/web/**` 時,
  build(注入 `VITE_API_BASE_URL`)→ 以 **Workload Identity** 取得憑證 →
  `firebase deploy --only hosting:cleo-device-mgmt --project <id>`。
- 新增 `apps/web/deploy/firebase-setup.md`:一次性設定(建 site、授權部署 SA
  `firebasehosting.admin`、設 repo Variable)。
- 設定 repo Variable `WEB_API_BASE_URL`(production 後端 URL),build 時注入。

## 為什麼這樣做

- 重用後端既有的 WIF(`cleo-github` pool / `cleo-gha-deployer`),免金鑰、不必再建一套。
- site 以 `firebase.json` 的 `site` 欄位指定;`.firebaserc` 僅設定預設 project
  (`machine-status-494306`,該 id 在 dev-log/指南中已出現),CI 另以
  `--project ${{ vars.GCP_PROJECT_ID }}` 明確帶入。
- Hosting site 加 `cleo-` 前綴,避免與共用 Firebase 專案中同事的 site 撞名。
- 前端為 SPA(vue-router history 模式),需 rewrites 讓深層路徑都回 `index.html`。

## 影響範圍 / 後續注意事項

- 一次性設定(見 `firebase-setup.md`):建立 site `cleo-device-mgmt`、授予
  `cleo-gha-deployer` 角色 `roles/firebasehosting.admin`。
- 部署後前端網域為 `https://cleo-device-mgmt.web.app`;後端 CORS 預設反射任何來源故可直接運作,
  之後建議以 `CORS_ORIGINS` 收斂為「localhost + 此網域」。
- CI 以 `firebase-tools` + WIF 的 ADC 部署;若 firebase CLI 對 ADC 支援有問題,改用
  `FirebaseExtended/action-hosting-deploy` 為備案。
