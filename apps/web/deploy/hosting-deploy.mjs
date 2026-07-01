// Deploy the built `dist/` to Firebase Hosting via the REST API, authenticating
// with a short-lived OAuth access token (Bearer) supplied in $HOSTING_TOKEN.
//
// Why this exists instead of `firebase deploy`:
//   firebase-tools wraps its ADC resolution in a hardcoded timeout; with
//   Workload Identity Federation (external_account) the token exchange can
//   exceed it, so the CLI fails with "Failed to authenticate, have you run
//   firebase login?" even though the WIF credentials are valid. It also does
//   not honor a pre-minted bearer token (GOOGLE_OAUTH_ACCESS_TOKEN is ignored).
//   The Hosting REST API accepts a Bearer token directly, keeping us keyless.
//   See firebase/firebase-tools#10726.
//
// Usage:
//   HOSTING_TOKEN=$(gcloud auth print-access-token) node deploy/hosting-deploy.mjs
//   SITE=cleo-device-mgmt DIST=dist node deploy/hosting-deploy.mjs

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative, sep } from 'node:path'

const API = 'https://firebasehosting.googleapis.com/v1beta1'
const SITE = process.env.SITE || 'cleo-device-mgmt'
const DIST = process.env.DIST || 'dist'
const TOKEN = process.env.HOSTING_TOKEN
// Quota/billing project for the request. Required when the caller uses user
// credentials (sent as the x-goog-user-project header on every call).
const PROJECT =
  process.env.PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'machine-status-494306'
// SPA rewrite mirrors firebase.json (all paths -> /index.html).
const REWRITES = [{ glob: '**', path: '/index.html' }]

if (!TOKEN) {
  console.error('HOSTING_TOKEN env var is required (an OAuth access token).')
  process.exit(1)
}

async function api(method, url, body, extraHeaders = {}) {
  const res = await fetch(url.startsWith('http') ? url : `${API}/${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROJECT,
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${text}`)
  }
  return text ? JSON.parse(text) : {}
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

// 1. gzip every file; Hosting keys files by the SHA-256 of the gzipped bytes.
const files = walk(DIST).map((full) => {
  const gz = gzipSync(readFileSync(full))
  const hash = createHash('sha256').update(gz).digest('hex')
  const path = '/' + relative(DIST, full).split(sep).join('/')
  return { path, hash, gz }
})
const byHash = new Map(files.map((f) => [f.hash, f]))
console.log(`準備 ${files.length} 個檔案上傳到 site "${SITE}"`)

// 2. Create a new version with the SPA rewrite config.
const version = await api('POST', `sites/${SITE}/versions`, {
  config: { rewrites: REWRITES },
})
const versionName = version.name // sites/<site>/versions/<id>
console.log(`建立 version: ${versionName}`)

// 3. Declare the file manifest; the API tells us which blobs it still needs.
const populate = await api('POST', `${API}/${versionName}:populateFiles`, {
  files: Object.fromEntries(files.map((f) => [f.path, f.hash])),
})
const required = populate.uploadRequiredHashes || []
console.log(`需上傳 ${required.length} 個 blob`)

// 4. Upload each required gzipped blob to <uploadUrl>/<hash>.
for (const hash of required) {
  const f = byHash.get(hash)
  if (!f) throw new Error(`Hosting requested unknown hash ${hash}`)
  const res = await fetch(`${populate.uploadUrl}/${hash}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/octet-stream',
      'x-goog-user-project': PROJECT,
    },
    body: f.gz,
  })
  if (!res.ok) {
    throw new Error(`upload ${f.path} -> ${res.status}: ${await res.text()}`)
  }
  console.log(`  上傳 ${f.path}`)
}

// 5. Finalize the version, then 6. release it live.
await api('PATCH', `${API}/${versionName}?updateMask=status`, {
  status: 'FINALIZED',
})
console.log('version finalized')

await api(
  'POST',
  `sites/${SITE}/releases?versionName=${encodeURIComponent(versionName)}`,
  {},
)
console.log(`✔ 部署完成 → https://${SITE}.web.app`)
