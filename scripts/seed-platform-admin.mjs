#!/usr/bin/env node
/**
 * Create or update the platform admin account.
 * Usage:
 *   PLATFORM_ADMIN_EMAIL=contato@boracasar.net.br \
 *   PLATFORM_ADMIN_PASSWORD='your-password' \
 *   node scripts/seed-platform-admin.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync } from 'crypto'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function normalizeEnvValue(value) {
  let normalized = value.trim()
  // Ignore accidental shell line continuations copied into .env.local
  normalized = normalized.replace(/\\\s*$/, '').trim()
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1)
  }
  return normalized
}

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = normalizeEnvValue(trimmed.slice(eq + 1))
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

loadEnvLocal()

const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.PLATFORM_ADMIN_PASSWORD
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!email || !password) {
  console.error('Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD')
  process.exit(1)
}
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: existing } = await supabase
  .from('platform_admins')
  .select('id')
  .eq('email', email)
  .maybeSingle()

const password_hash = hashPassword(password)

if (existing) {
  const { error } = await supabase
    .from('platform_admins')
    .update({ password_hash })
    .eq('id', existing.id)
  if (error) {
    console.error('Update failed:', error.message)
    process.exit(1)
  }
  console.log('Platform admin password updated:', email)
} else {
  const { error } = await supabase.from('platform_admins').insert({ email, password_hash })
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
  console.log('Platform admin created:', email)
}
