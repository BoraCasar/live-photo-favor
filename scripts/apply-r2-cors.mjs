#!/usr/bin/env node
/**
 * Apply R2 bucket CORS for boracasar.net.br production.
 * Usage: node scripts/apply-r2-cors.mjs
 * Requires: CLOUDFLARE_API_TOKEN, R2_ACCOUNT_ID, R2_BUCKET_NAME in .env.local
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local optional if vars exported
  }
}

loadEnvLocal()

const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
const accountId = process.env.R2_ACCOUNT_ID?.trim()
const bucket = process.env.R2_BUCKET_NAME?.trim()

if (!token || !accountId || !bucket) {
  console.error('Missing CLOUDFLARE_API_TOKEN, R2_ACCOUNT_ID, or R2_BUCKET_NAME')
  process.exit(1)
}

const cors = JSON.parse(
  readFileSync(resolve(root, 'supabase/r2-cors-boracasar.json'), 'utf8')
)

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/cors`

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(cors),
})

const body = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error('Failed to apply R2 CORS:', res.status, JSON.stringify(body, null, 2))
  process.exit(1)
}

console.log('R2 CORS applied successfully for bucket:', bucket)
console.log(JSON.stringify(cors, null, 2))
