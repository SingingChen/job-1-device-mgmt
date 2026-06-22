# Dashboard 新增「依類別統計」

- 日期:2026-06-22
- 類型:feat
- 範圍:web

## 做了什麼

- `DashboardView` 新增「依類別」區塊:依裝置 `category` 統計各類別數量(`null` 歸為「未分類」),
  以 chip + 數量呈現,依數量由多到少排序。
- 純前端在現有 `GET /devices` 結果上計算,不需更動後端。

## 為什麼這樣做

- 首頁同時呈現「狀態」與「類別」兩個維度的概覽,更貼合「Dashboard 資訊」與「分類」需求。

## 影響範圍 / 後續注意事項

- 僅前端變更,push `apps/web/**` 觸發 Firebase Hosting 部署。
