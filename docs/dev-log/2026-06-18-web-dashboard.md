# 前端:新增 Dashboard 首頁

- 日期:2026-06-18
- 類型:feat
- 範圍:web

## 做了什麼

- 新增 `DashboardView.vue` 作為首頁(`/` → `/dashboard`):
  - 統計卡:裝置總數、各狀態(線上/離線/維護)數量。
  - 最近新增的裝置(取列表前 5 筆,後端已依 `createdAt` 由新到舊排序)。
- `AppHeader` 加入 Dashboard / 裝置 導覽連結(active 樣式)。
- 路由新增 `/dashboard`(requiresAuth),`/` 改導向 dashboard。

## 為什麼這樣做

- 對應主管需求「首頁為簡單的 Dashboard 資訊」。
- 統計以現有 `GET /devices` 在前端計算,**不需更動後端**,最快補上缺口。
- 資料仍受擁有者隔離(一般使用者看到的是自己的裝置統計)。

## 影響範圍 / 後續注意事項

- 純前端變更,push `apps/web/**` 觸發 Firebase Hosting 部署。
- 若日後新增「裝置分類(category)」欄位,Dashboard 可再加「依類別統計」。
