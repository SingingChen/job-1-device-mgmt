#!/usr/bin/env bash
# =============================================================================
# Build the API container and deploy it to GCP Cloud Run.
#
# This project shares a GCP project with other people, so every resource we
# create is prefixed with `cleo-` to avoid collisions.
#
# Secrets (DATABASE_URL, JWT_SECRET) come from Secret Manager — see the
# one-time setup block below. Cloud SQL is reached over a Unix socket mounted
# by --add-cloudsql-instances; DATABASE_URL must use:
#   postgresql://USER:PASS@localhost/DB?host=/cloudsql/<INSTANCE_CONNECTION_NAME>&schema=public
#
# Usage:
#   PROJECT_ID=machine-status-494306 REGION=asia-east1 \
#   INSTANCE_CONNECTION_NAME=machine-status-494306:asia-east1:cleo-device-mgmt \
#   ./deploy/deploy-cloud-run.sh
# =============================================================================
set -euo pipefail

# ---- Config (override via env) ----------------------------------------------
PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-asia-east1}"
SERVICE="${SERVICE:-cleo-device-api}"
INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME:?set INSTANCE_CONNECTION_NAME (project:region:instance)}"

# Artifact Registry repo path (repo must already exist; see setup notes).
REPO="${REPO:-cleo-containers}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:latest"

# Runtime service account (least privilege; granted secretAccessor below).
RUNTIME_SA="${RUNTIME_SA:-cleo-device-api@${PROJECT_ID}.iam.gserviceaccount.com}"

# =============================================================================
# ONE-TIME SETUP (run manually once per project, not on every deploy)
# -----------------------------------------------------------------------------
# # Enable required APIs:
# gcloud services enable run.googleapis.com secretmanager.googleapis.com \
#     artifactregistry.googleapis.com sqladmin.googleapis.com --project "$PROJECT_ID"
#
# # Artifact Registry repo for images:
# gcloud artifacts repositories create "$REPO" --repository-format=docker \
#     --location="$REGION" --project "$PROJECT_ID"
#
# # Create secrets from stdin (keeps values out of shell history / argv):
# printf '%s' 'postgresql://USER:PASS@localhost/DB?host=/cloudsql/'"$INSTANCE_CONNECTION_NAME"'&schema=public' \
#     | gcloud secrets create cleo-database-url --data-file=- --project "$PROJECT_ID"
# printf '%s' "$(openssl rand -hex 32)" \
#     | gcloud secrets create cleo-jwt-secret --data-file=- --project "$PROJECT_ID"
#
# # Grant the runtime SA read access to those secrets (least privilege):
# for S in cleo-database-url cleo-jwt-secret; do
#   gcloud secrets add-iam-policy-binding "$S" --project "$PROJECT_ID" \
#       --member="serviceAccount:${RUNTIME_SA}" \
#       --role="roles/secretmanager.secretAccessor"
# done
#
# # Apply DB migrations BEFORE first deploy (run locally via the Auth Proxy,
# # do NOT use migrate dev in production):
# #   cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port 5432 &
# #   DATABASE_URL=... npx prisma migrate deploy
# =============================================================================

echo "==> Building image: $IMAGE"
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID" .

echo "==> Deploying service: $SERVICE ($REGION)"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --service-account "$RUNTIME_SA" \
  --add-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
  --set-secrets "DATABASE_URL=cleo-database-url:latest,JWT_SECRET=cleo-jwt-secret:latest" \
  --set-env-vars "JWT_EXPIRES_IN=1d" \
  --allow-unauthenticated

echo "==> Done. Service URL:"
gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" \
  --format='value(status.url)'
