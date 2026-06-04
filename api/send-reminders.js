import webpush from 'web-push'
import {
  createReminderTargets,
  formatDaysLeft,
  getLocalDateParts,
  getSupabaseAdmin,
  handleError,
  handleOptions,
  minutes,
  readJson,
  requireDeviceSecret,
  sendJson,
} from './_shared.js'

function configureWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:kitchen-stock-reminder@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  return true
}

function createMessage(targets) {
  return targets.map((target) => `${target.name} ${formatDaysLeft(target.daysLeft)}`).join(' / ')
}

async function sendEmail(to, message) {
  if (!to || !process.env.RESEND_API_KEY) return { skipped: true }
  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: process.env.REMINDER_EMAIL_FROM || 'Kitchen Stock <onboarding@resend.dev>',
      html: `<p>${message.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])}</p>`,
      subject: '食材期限リマインド',
      to,
    }),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  return { ok: response.ok, status: response.status }
}

async function sendLine(target, message) {
  if (!target || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return { skipped: true }
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    body: JSON.stringify({
      messages: [{ text: message, type: 'text' }],
      to: target,
    }),
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  return { ok: response.ok, status: response.status }
}

async function sendWebhook(url, message) {
  if (!url) return { skipped: true }
  const response = await fetch(url, {
    body: JSON.stringify({ message, title: '食材期限リマインド' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  return { ok: response.ok, status: response.status }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST' && req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const admin = getSupabaseAdmin()
    const body = req.method === 'POST' ? await readJson(req) : {}
    const cronSecret = process.env.CRON_SECRET || ''
    const authHeader = String(req.headers.authorization || '')
    const cronAuthorized =
      Boolean(cronSecret) && (req.headers['x-cron-secret'] === cronSecret || authHeader === `Bearer ${cronSecret}`)
    const force = Boolean(body.force)
    const targetCredentials = body.deviceId || body.p_device_id ? requireDeviceSecret(body) : null

    if (!targetCredentials && !cronAuthorized) {
      return sendJson(res, 401, { error: 'cron_secret_required' })
    }

    const webPushReady = configureWebPush()
    let query = admin.from('kitchen_push_subscriptions').select('*').eq('status', 'active')
    if (targetCredentials) {
      query = query.eq('device_id', targetCredentials.deviceId).eq('secret_hash', targetCredentials.secretHash)
    }
    const { data: subscriptions, error: subscriptionError } = await query
    if (subscriptionError) throw subscriptionError

    const deviceIds = [...new Set((subscriptions || []).map((subscription) => subscription.device_id))]
    const { data: profiles, error: profileError } = await admin
      .from('kitchen_stock_profiles')
      .select('device_id, secret_hash, payload')
      .in('device_id', deviceIds.length > 0 ? deviceIds : ['__none__'])
    if (profileError) throw profileError

    const profileMap = new Map((profiles || []).map((profile) => [`${profile.device_id}:${profile.secret_hash}`, profile]))
    let checked = 0
    let sent = 0
    let skipped = 0

    for (const subscription of subscriptions || []) {
      checked += 1
      const local = getLocalDateParts(subscription.timezone || 'Asia/Tokyo')
      const due =
        force ||
        (subscription.last_sent_date !== local.date && local.minutes >= minutes(subscription.daily_time || '08:00'))
      if (!due) {
        skipped += 1
        continue
      }

      const profile = profileMap.get(`${subscription.device_id}:${subscription.secret_hash}`)
      const targets = createReminderTargets(profile?.payload, local.date)
      if (targets.length === 0) {
        await admin.from('kitchen_push_subscriptions').update({ last_sent_date: local.date }).eq('id', subscription.id)
        skipped += 1
        continue
      }

      const message = createMessage(targets)
      const payload = JSON.stringify({
        body: message,
        data: { url: '/#today-check' },
        tag: 'kitchen-stock-reminder',
        title: '食材期限リマインド',
      })

      if (webPushReady && subscription.subscription) {
        try {
          await webpush.sendNotification(subscription.subscription, payload)
          sent += 1
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) {
            await admin.from('kitchen_push_subscriptions').update({ status: 'inactive' }).eq('id', subscription.id)
          }
        }
      }

      await Promise.allSettled([
        sendEmail(subscription.email_address, message),
        sendLine(subscription.line_target, message),
        sendWebhook(subscription.webhook_url, message),
      ])

      await admin
        .from('kitchen_push_subscriptions')
        .update({ last_sent_date: local.date, updated_at: new Date().toISOString() })
        .eq('id', subscription.id)
    }

    sendJson(res, 200, {
      checked,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      lineConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      sent,
      skipped,
      webPushReady,
    })
  } catch (error) {
    handleError(res, error)
  }
}
