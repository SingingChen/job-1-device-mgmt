# GitHub Actions → Cloud Run:Workload Identity 一次性設定

CI 不放長期金鑰,改用 Workload Identity Federation(WIF):GitHub Actions 以 OIDC
token 換取短期 GCP 憑證。以下指令一個專案只需跑一次,跑完把產出的值填進 GitHub repo
的 **Variables**(Settings → Secrets and variables → Actions → Variables)。

> 真正的機密(`DATABASE_URL`、`JWT_SECRET`)只放 **GCP Secret Manager**,不進 GitHub。

## 0. 變數

```bash
export PROJECT_ID="my-project"
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export REGION="asia-east1"
export REPO="containers"
export GH_REPO="<github-owner>/<repo>"     # 例:cleo/job-1-device-mgmt
export DEPLOY_SA="gha-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
export RUNTIME_SA="device-api@${PROJECT_ID}.iam.gserviceaccount.com"
```

## 1. 啟用 API、建 Artifact Registry

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
    iamcredentials.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com \
    --project "$PROJECT_ID"

gcloud artifacts repositories create "$REPO" --repository-format=docker \
    --location="$REGION" --project "$PROJECT_ID"
```

## 2. 兩個 Service Account

```bash
# 部署用(CI 假冒此 SA)
gcloud iam service-accounts create gha-deployer --project "$PROJECT_ID"
# 執行用(Cloud Run service 以此身分跑)
gcloud iam service-accounts create device-api --project "$PROJECT_ID"

# 部署 SA 權限:部署 Cloud Run、推 image、以及 actAs 執行 SA
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}" --role="roles/run.admin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}" --role="roles/artifactregistry.writer"
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --project "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}" --role="roles/iam.serviceAccountUser"

# 執行 SA 權限:讀 secret、連 Cloud SQL
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudsql.client"
for S in database-url jwt-secret; do
  gcloud secrets add-iam-policy-binding "$S" --project "$PROJECT_ID" \
      --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
done
```

(secret 本身的建立見 `deploy-cloud-run.sh` 註解區的「以 stdin 建 secret」。)

## 3. Workload Identity Pool / Provider

```bash
gcloud iam workload-identity-pools create github --project "$PROJECT_ID" \
    --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-oidc \
    --project "$PROJECT_ID" --location=global --workload-identity-pool=github \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '${GH_REPO}'"

# 只允許本 repo 假冒部署 SA(綁定到 repository 屬性)
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --project "$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${GH_REPO}"
```

## 4. 填進 GitHub repo Variables

| Variable | 值 |
|----------|----|
| `GCP_PROJECT_ID` | `$PROJECT_ID` |
| `WIF_PROVIDER` | `projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc` |
| `DEPLOY_SA` | `$DEPLOY_SA` |
| `RUNTIME_SA` | `$RUNTIME_SA` |
| `INSTANCE_CONNECTION_NAME` | `project:region:instance` |

## 5. 資料庫遷移(部署前)

workflow 只負責 build + deploy,**不在 CI 跑 migration**。首次部署前、或有新 migration 時,
透過 Auth Proxy 執行(production 禁用 `migrate dev`):

```bash
cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port 5432 &
DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/DB?schema=public" \
    npx prisma migrate deploy
```

備妥以上後,push 到 `master`(且改動到 `apps/api/**`)即會觸發 `.github/workflows/deploy-api.yml`。
