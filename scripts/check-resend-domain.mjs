#!/usr/bin/env node
/**
 * Verify Resend domain status (optional).
 * Usage: node scripts/check-resend-domain.mjs
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
    // optional
  }
}

loadEnvLocal()

const apiKey = process.env.RESEND_API_KEY?.trim()
if (!apiKey) {
  console.error('RESEND_API_KEY not set')
  process.exit(1)
}

const res = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${apiKey}` },
})

const body = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error('Resend API error:', res.status, body)
  process.exit(1)
}

const domains = body.data ?? []
const target = domains.find((d) => d.name === 'boracasar.net.br')

console.log('Resend domains:')
for (const d of domains) {
  console.log(`  - ${d.name}: ${d.status}`)
}

if (target) {
  console.log('\nboracasar.net.br status:', target.status)
  if (target.status !== 'verified') {
    console.log('Add DNS records in Resend dashboard to verify the domain.')
    process.exit(1)
  }
  console.log('Domain verified — password reset emails can be sent.')
} else {
  console.log('\nboracasar.net.br not found in Resend. Add the domain at resend.com/domains')
  process.exit(1)
}
