// End-to-end API scenario tests (black-box, over HTTP).
//
// Usage:
//   node test/scenarios.mjs                         # 預設打 production
//   API_BASE_URL=http://localhost:3000 node test/scenarios.mjs   # 打本機後端
//   (或透過 npm:  npm run test:scenarios)
//
// 以一次性測試帳號 / 時間戳序號執行,可重複跑。任一項失敗則 exit code = 1。

const BASE =
  process.env.API_BASE_URL ||
  'https://cleo-device-api-623878673471.asia-east1.run.app'

let pass = 0
let fail = 0
const rows = []

function rec(id, desc, expected, actual) {
  const ok = expected === actual
  ok ? pass++ : fail++
  rows.push({ id, desc, expected, actual, ok })
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* 204 / non-JSON */
  }
  return { status: res.status, json }
}

;(async () => {
  const ts = Date.now()
  const A = `qa-a-${ts}@example.com`
  const B = `qa-b-${ts}@example.com`
  const PW = 'Test1234!'

  console.log(`\n受測目標: ${BASE}\n`)

  // ---- AUTH ----
  rec('A1', '註冊新帳號', 201, (await req('POST', '/auth/register', { body: { email: A, password: PW, name: 'QA A' } })).status)
  rec('A2', '重複 email 註冊', 409, (await req('POST', '/auth/register', { body: { email: A, password: PW, name: 'QA A' } })).status)
  rec('A3', '正確帳密登入', 200, (await req('POST', '/auth/login', { body: { email: A, password: PW } })).status)
  rec('A4', '錯誤密碼登入', 401, (await req('POST', '/auth/login', { body: { email: A, password: 'wrongpass' } })).status)
  rec('A5', 'email 格式錯誤', 400, (await req('POST', '/auth/register', { body: { email: 'notanemail', password: PW, name: 'x' } })).status)
  rec('A6', '密碼少於 8 碼', 400, (await req('POST', '/auth/register', { body: { email: `q2-${ts}@example.com`, password: '123', name: 'x' } })).status)

  const tokA = (await req('POST', '/auth/login', { body: { email: A, password: PW } })).json?.accessToken
  await req('POST', '/auth/register', { body: { email: B, password: PW, name: 'QA B' } })
  const tokB = (await req('POST', '/auth/login', { body: { email: B, password: PW } })).json?.accessToken
  rec('A7', '帶 token 取得自己 /auth/me', 200, (await req('GET', '/auth/me', { token: tokA })).status)
  rec('A8', '未帶 token 取 /auth/me', 401, (await req('GET', '/auth/me')).status)

  // ---- DEVICE CRUD ----
  const created = await req('POST', '/devices', { token: tokA, body: { name: 'QA Device', serialNumber: `QA-${ts}`, status: 'ONLINE', category: '感測器' } })
  rec('D1', '新增裝置(含類別)', 201, created.status)
  const did = created.json?.id
  rec('D2', '重複序號', 409, (await req('POST', '/devices', { token: tokA, body: { name: 'dup', serialNumber: `QA-${ts}` } })).status)
  rec('D3', '列出裝置', 200, (await req('GET', '/devices', { token: tokA })).status)
  rec('D4', '取得單筆', 200, (await req('GET', `/devices/${did}`, { token: tokA })).status)
  rec('D5', '更新狀態 (PATCH)', 200, (await req('PATCH', `/devices/${did}`, { token: tokA, body: { status: 'MAINTENANCE' } })).status)
  rec('D6', '依狀態篩選', 200, (await req('GET', '/devices?status=MAINTENANCE', { token: tokA })).status)
  rec('D7', '依類別篩選', 200, (await req('GET', `/devices?category=${encodeURIComponent('感測器')}`, { token: tokA })).status)
  rec('D8', '缺必填欄位(無序號)', 400, (await req('POST', '/devices', { token: tokA, body: { name: 'no-serial' } })).status)
  rec('D9', '未帶 token 取裝置', 401, (await req('GET', '/devices')).status)

  // ---- 列表分頁 / 搜尋 / 統計 ----
  const listRes = await req('GET', '/devices?pageSize=1', { token: tokA })
  const lp = listRes.json
  rec('D11', '列表回傳分頁結構', true, Array.isArray(lp?.items) && typeof lp?.total === 'number' && typeof lp?.page === 'number')
  rec('D12', '分頁 pageSize=1 生效', true, lp?.pageSize === 1 && lp.items.length <= 1)
  const searchRes = await req('GET', `/devices?search=QA-${ts}`, { token: tokA })
  rec('D13', '依序號搜尋命中', true, (searchRes.json?.items ?? []).some((d) => d.serialNumber === `QA-${ts}`))
  const ciRes = await req('GET', '/devices?search=qa%20device', { token: tokA })
  rec('D14', '搜尋不分大小寫(名稱)', true, (ciRes.json?.total ?? 0) >= 1)
  const statsRes = await req('GET', '/devices/stats', { token: tokA })
  const st = statsRes.json
  rec('D15', '統計端點(total/byStatus/byCategory)', true, statsRes.status === 200 && typeof st?.total === 'number' && !!st?.byStatus && Array.isArray(st?.byCategory))

  // ---- 資料隔離 ----
  const devB = await req('POST', '/devices', { token: tokB, body: { name: 'B Device', serialNumber: `QB-${ts}` } })
  const didB = devB.json?.id
  rec('S1', 'A 取 B 的裝置(404 不洩漏)', 404, (await req('GET', `/devices/${didB}`, { token: tokA })).status)
  rec('S2', 'A 刪 B 的裝置(404)', 404, (await req('DELETE', `/devices/${didB}`, { token: tokA })).status)
  rec('D10', '刪除自己的裝置', 204, (await req('DELETE', `/devices/${did}`, { token: tokA })).status)

  // ---- CORS ----
  const cors = await fetch(BASE + '/auth/login', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://cleo-device-mgmt.web.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  rec('C1', '前端網域 CORS preflight', 204, cors.status)

  // ---- 輸出 ----
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.id.padEnd(3)} | ${r.desc.padEnd(26)} | 期望 ${r.expected} 實得 ${r.actual}`)
  }
  console.log(`\n================ 結果: PASS=${pass} FAIL=${fail} ================\n`)
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('測試執行錯誤:', e.message)
  process.exit(1)
})
