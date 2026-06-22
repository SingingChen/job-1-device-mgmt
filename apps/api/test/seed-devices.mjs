// Batch-create devices via the API (no bulk endpoint; loops POST /devices).
//
// Usage:
//   node test/seed-devices.mjs                       # 對 production 的 demo 帳號建 20 筆
//   SEED_COUNT=50 node test/seed-devices.mjs         # 改數量
//   API_BASE_URL=http://localhost:3000 node test/seed-devices.mjs   # 打本機
//   SEED_EMAIL=foo@bar SEED_PASSWORD=... node test/seed-devices.mjs # 指定帳號
//   (或 npm run seed:devices)

const BASE = process.env.API_BASE_URL || 'https://cleo-device-api-623878673471.asia-east1.run.app'
const EMAIL = process.env.SEED_EMAIL || 'demo@cleo.dev'
const PASSWORD = process.env.SEED_PASSWORD || 'Demo1234!'
const COUNT = Number(process.env.SEED_COUNT || 20)

const STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE']
const CATEGORIES = ['感測器', '攝影機', '網路設備', '控制器', '其他']
const NAMES = [
  '溫濕度感測器', '監視攝影機', '網路交換器', '無線基地台', '空調控制器',
  '電力監測器', '煙霧偵測器', '閘門控制器', '顯示看板', '門禁讀卡機',
]

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
  try { json = await res.json() } catch { /* noop */ }
  return { status: res.status, json }
}

;(async () => {
  console.log(`目標: ${BASE}  帳號: ${EMAIL}  數量: ${COUNT}\n`)
  const login = await req('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } })
  const token = login.json?.accessToken
  if (!token) {
    console.error(`登入失敗 (HTTP ${login.status})。請確認帳號密碼,或先註冊。`)
    process.exit(1)
  }

  const ts = Date.now()
  let ok = 0
  let fail = 0
  for (let i = 1; i <= COUNT; i++) {
    const body = {
      name: `${NAMES[(i - 1) % NAMES.length]} ${String(i).padStart(2, '0')}`,
      serialNumber: `BULK-${ts}-${i}`,
      status: STATUSES[(i - 1) % STATUSES.length],
      category: CATEGORIES[(i - 1) % CATEGORIES.length],
      description: `批次建立 #${i}`,
    }
    const r = await req('POST', '/devices', { token, body })
    if (r.status === 201) ok++
    else {
      fail++
      console.log(`  #${i} 失敗 HTTP ${r.status}: ${JSON.stringify(r.json?.message ?? '')}`)
    }
  }

  const all = await req('GET', '/devices', { token })
  console.log(`\n建立完成: 成功 ${ok} / 失敗 ${fail}。此帳號目前共 ${all.json?.length ?? '?'} 筆裝置。`)
  process.exit(fail ? 1 : 0)
})().catch((e) => {
  console.error('執行錯誤:', e.message)
  process.exit(1)
})
