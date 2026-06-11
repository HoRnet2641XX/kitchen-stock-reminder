import crypto from 'node:crypto'
import { getSupabaseAdmin, handleError, handleOptions, sendJson } from './_shared.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function verifyLineSignature(rawBody, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    const error = new Error('LINE channel secret is not configured')
    error.statusCode = 500
    throw error
  }
  if (!signature) return false

  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(String(signature))
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

function normalizeLineCode(text) {
  const matched = String(text || '')
    .trim()
    .match(/\bKSR[-\s]?(\d{6})\b/i)
  return matched ? `KSR-${matched[1]}` : ''
}

async function getLineDisplayName(userId) {
  if (!userId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return ''
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
  })
  if (!response.ok) return ''
  const profile = await response.json().catch(() => ({}))
  return typeof profile.displayName === 'string' ? profile.displayName : ''
}

async function replyLine(replyToken, text) {
  if (!replyToken || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    body: JSON.stringify({
      messages: [{ text, type: 'text' }],
      replyToken,
    }),
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  if (!response.ok) {
    console.warn('LINE reply failed', response.status)
  }
}

async function linkLineUser(admin, code, userId) {
  const now = new Date().toISOString()
  const { data: link, error } = await admin
    .from('kitchen_line_links')
    .select('id, device_id, secret_hash')
    .eq('code', code)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .maybeSingle()

  if (error) throw error
  if (!link) return null

  const displayName = await getLineDisplayName(userId)
  const { error: insertError } = await admin
    .from('kitchen_line_links')
    .insert({
      code: `${code}-LINKED-${crypto.randomUUID()}`,
      device_id: link.device_id,
      expires_at: now,
      line_display_name: displayName || null,
      line_user_id: userId,
      linked_at: now,
      secret_hash: link.secret_hash,
      status: 'linked',
      updated_at: now,
    })

  if (insertError) throw insertError

  const { error: subscriptionError } = await admin
    .from('kitchen_push_subscriptions')
    .update({ line_target: userId, updated_at: now })
    .eq('device_id', link.device_id)
    .eq('secret_hash', link.secret_hash)
    .eq('status', 'active')

  if (subscriptionError) console.warn('LINE subscription target update failed', subscriptionError.message)
  return { displayName, ...link }
}

async function handleLineEvent(admin, event) {
  const userId = event?.source?.userId
  const replyToken = event?.replyToken

  if (!userId) return { linked: false, skipped: true }

  if (event.type === 'follow') {
    await replyLine(replyToken, '食材期限帳でLINE連携コードを発行し、そのコードをこのトークに送ってください。')
    return { linked: false, skipped: false }
  }

  if (event.type !== 'message' || event.message?.type !== 'text') return { linked: false, skipped: true }

  const code = normalizeLineCode(event.message.text)
  if (!code) {
    await replyLine(replyToken, '連携コードを確認できませんでした。食材期限帳で新しいコードを発行して送ってください。')
    return { linked: false, skipped: false }
  }

  const link = await linkLineUser(admin, code, userId)
  if (!link) {
    await replyLine(replyToken, '連携コードの期限が切れているか、コードが違います。食材期限帳で新しいコードを発行してください。')
    return { linked: false, skipped: false }
  }

  await replyLine(replyToken, '食材期限帳のLINE通知を連携しました。期限が近い食材をLINEでもお知らせします。')
  return { linked: true, skipped: false }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const rawBody = await readRawBody(req)
    if (!verifyLineSignature(rawBody, req.headers['x-line-signature'])) {
      return sendJson(res, 401, { error: 'invalid_signature' })
    }

    const payload = rawBody ? JSON.parse(rawBody) : {}
    const events = Array.isArray(payload.events) ? payload.events : []
    const admin = getSupabaseAdmin()
    const results = await Promise.all(events.map((event) => handleLineEvent(admin, event)))

    sendJson(res, 200, {
      linked: results.filter((result) => result.linked).length,
      ok: true,
      received: events.length,
      skipped: results.filter((result) => result.skipped).length,
    })
  } catch (error) {
    handleError(res, error)
  }
}
