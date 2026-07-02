
1. Dashboard 首頁(對應「首頁 Dashboard」) 開 /dashboard → 指:裝置總數、各狀態統計、依類別統計、最近裝置。(現在有 76 筆,畫面很滿)

2. 裝置管理 + 分類(對應「清單 / 註冊 / 分類」) 點「裝置」→ 新增一筆(選狀態+類別)→ 用「全部狀態 / 全部類別」下拉篩選 → 編輯改狀態 → 刪除。

3. ⭐ 即時更新(亮點) 開兩個瀏覽器視窗並排(都登入 demo),A 放 Dashboard、B 放裝置頁: → 在 B 新增一筆裝置 → A 不用重新整理就自己跳出新數字/新列。

替代法(你一個人):終端機跑 cd apps/api && SEED_COUNT=3 npm run seed:devices(預設打雲端=網站聽的同一個後端)→ 開著的網站即時長出 3 筆。

4. 測試(對應「測試情境與結果報告」) 終端機:

cd ~/workspace/demo/job-1-device-mgmt/apps/api
npm run test:scenarios

→ 當場跑出 PASS=21 FAIL=0,再開 docs/test-report.md 對照。

5.(可選)AI Agent 工程面 GitHub → Actions(全綠自動部署)、docs/(規格 backend-api-guide.md + 測試報告 + dev-log)、CLAUDE.md(給 agent 的規範)。

⚠️ 即時更新要成功的唯一條件
觸發變更的動作要打到雲端後端:

✅ 在線上網站上操作(視窗 B 新增)
✅ npm run seed:devices(預設就是雲端)




demo@cleo.dev
Demo1234!