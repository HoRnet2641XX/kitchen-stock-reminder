import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders)
    res.end()
    return true
  }
  return false
}

export function sendJson(res, status, body) {
  res.writeHead(status, jsonHeaders)
  res.end(JSON.stringify(body))
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  return JSON.parse(text)
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin environment is not configured')
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex')
}

export function requireDeviceSecret(body) {
  const deviceId = String(body.deviceId || body.p_device_id || '').trim()
  const secret = String(body.secret || body.p_secret || '').trim()
  if (deviceId.length < 8 || secret.length < 20) {
    const error = new Error('Invalid sync credentials')
    error.statusCode = 400
    throw error
  }
  return { deviceId, secret, secretHash: hashSecret(secret) }
}

export async function verifyProfile(admin, deviceId, secretHash) {
  const { data, error } = await admin
    .from('kitchen_stock_profiles')
    .select('device_id, payload')
    .eq('device_id', deviceId)
    .eq('secret_hash', secretHash)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    const authError = new Error('Cloud profile not found')
    authError.statusCode = 404
    throw authError
  }
  return data
}

export function getLocalDateParts(timeZone = 'Asia/Tokyo', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  }
}

export function minutes(value = '08:00') {
  const [hour, minute] = String(value).split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 480
  return hour * 60 + minute
}

export function diffDays(fromIso, toIso) {
  const start = new Date(`${fromIso}T00:00:00Z`).getTime()
  const end = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.round((end - start) / 86_400_000)
}

export function createReminderTargets(payload, todayIso) {
  const snapshotTargets = payload?.reminderSnapshot?.targets
  if (Array.isArray(snapshotTargets) && snapshotTargets.length > 0) {
    return snapshotTargets
      .filter((target) => target && target.deadline && !target.usedUp)
      .map((target) => ({
        deadline: target.deadline,
        daysLeft: diffDays(todayIso, target.deadline),
        name: String(target.name || '食材'),
        status: target.status || 'soon',
      }))
      .filter((target) => target.daysLeft <= 2 || ['expired', 'today', 'soon', 'low'].includes(target.status))
      .slice(0, 8)
  }

  const items = Array.isArray(payload?.items) ? payload.items : []
  return items
    .filter((item) => item && !item.usedUp)
    .map((item) => {
      const deadline = item.packageExpiry || item.manualExpiry || null
      return deadline
        ? {
            deadline,
            daysLeft: diffDays(todayIso, deadline),
            name: String(item.name || '食材'),
            status: 'soon',
          }
        : null
    })
    .filter(Boolean)
    .filter((target) => target.daysLeft <= 2)
    .slice(0, 8)
}

export function formatDaysLeft(daysLeft) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}日超過`
  if (daysLeft === 0) return '今日まで'
  return `あと${daysLeft}日`
}

export function endpointUrl(path) {
  const configured = process.env.APP_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (configured) return configured.startsWith('http') ? `${configured}${path}` : `https://${configured}${path}`
  return path
}

export function handleError(res, error) {
  const status = error.statusCode || 500
  sendJson(res, status, {
    error: status >= 500 ? 'server_error' : 'request_error',
    message: error.message || 'Request failed',
  })
}
