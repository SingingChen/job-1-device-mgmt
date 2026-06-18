# 前端部署 Firebase Hosting:一次性設定

沿用後端的 Workload Identity(WIF)與 `cleo-` 命名。Hosting site 用 `cleo-device-mgmt`
(共用 Firebase 專案,加前綴避免與同事的 site 撞名)。

## 0. 變數

```bash
export PROJECT_ID="machine-status-494306"
export DEPLOY_SA="cleo-gha-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
export SITE="cleo-device-mgmt"
```

## 1. 建立 Hosting site

擇一:

- **Firebase Console**:Hosting → Add another site → 輸入 `cleo-device-mgmt`。
- **CLI**:
  ```bash
  npx firebase-tools login        # 互動式,單獨執行一次
  npx firebase-tools hosting:sites:create "$SITE" --project "$PROJECT_ID"
  ```

建立後網址為 `https://cleo-device-mgmt.web.app`。

> site 名稱全球唯一;若被佔用,改名並同步更新 `apps/web/firebase.json`(`site` 欄位)與
> `.github/workflows/deploy-web.yml` 內的 `cleo-device-mgmt`。預設 project 由
> `apps/web/.firebaserc` 提供,CI 另以 `--project ${{ vars.GCP_PROJECT_ID }}` 明確帶入。

## 2. 授權部署 SA 部署 Hosting

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOY_SA}" \
  --role="roles/firebasehosting.admin"
```

## 3. GitHub repo Variable

```bash
gh variable set WEB_API_BASE_URL \
  --repo SingingChen/job-1-device-mgmt \
  --body "https://cleo-device-api-623878673471.asia-east1.run.app"
```

(`GCP_PROJECT_ID` / `WIF_PROVIDER` / `DEPLOY_SA` 沿用後端已設定的,不需重設。)

## 4. 觸發部署

push 到 `master` 且改動 `apps/web/**`,即觸發 `.github/workflows/deploy-web.yml`:
build → 以 WIF 取得憑證 → `firebase deploy --only hosting:cleo-device-mgmt`。
