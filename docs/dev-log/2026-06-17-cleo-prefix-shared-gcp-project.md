# 共用 GCP 專案:資源一律加 cleo- 前綴

- 日期:2026-06-17
- 類型:chore / docs
- 範圍:deploy / ci

## 做了什麼

- 確立命名約定:本專案部署所用的 GCP 專案(`machine-status-494306`)與同事共用測試,
  因此**所有由本專案建立的 GCP 資源一律加 `cleo-` 前綴**,避免與他人撞名。
- 對應改名並同步更新設定檔:

  | 資源 | 改成 |
  |------|------|
  | Artifact Registry repo | `cleo-containers` |
  | Cloud Run 服務 | `cleo-device-api` |
  | 部署 SA | `cleo-gha-deployer` |
  | 執行 SA | `cleo-device-api` |
  | Secret | `cleo-database-url` / `cleo-jwt-secret` |
  | WIF pool / provider | `cleo-github` / `cleo-github-oidc` |

- 更新 `.github/workflows/deploy-api.yml`(`SERVICE` / `REPO` / `--set-secrets`)、
  `apps/api/deploy/deploy-cloud-run.sh`、`apps/api/deploy/github-actions-wif-setup.md`,
  使檔案內名稱與 GCP 上實際建立的一致。

## 為什麼這樣做

- 共用專案下,未加前綴的資源(尤其是 project 層級唯一的 SA、Artifact Registry repo、
  WIF pool)容易與同事的同名資源衝突或誤刪;前綴可清楚標示歸屬。
- 設定檔與實際資源名稱必須一致,否則 `gcloud run deploy` 的 `--set-secrets` /
  image 路徑會找不到目標而失敗。

## 影響範圍 / 後續注意事項

- WIF Variables 中的 `WIF_PROVIDER` 路徑也改用 `cleo-github` / `cleo-github-oidc`。
- 若先前已誤建未加前綴的 `containers` repo,應刪除(空 repo 可直接刪)改用 `cleo-containers`。
- 後續所有新增 GCP 資源都沿用此前綴約定。
