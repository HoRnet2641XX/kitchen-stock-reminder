import { getSupabaseAdmin, handleError, handleOptions, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const cronSecret = process.env.CRON_SECRET || ''
    const authHeader = String(req.headers.authorization || '')
    const authorized =
      Boolean(cronSecret) && (req.headers['x-cron-secret'] === cronSecret || authHeader === `Bearer ${cronSecret}`)

    if (!authorized) {
      return sendJson(res, 200, {
        app: 'kitchen-stock-reminder',
        checkedAt: new Date().toISOString(),
        ok: true,
        public: true,
      })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('get_kitchen_operational_status')
    if (error) throw error

    sendJson(res, 200, {
      app: 'kitchen-stock-reminder',
      checkedAt: new Date().toISOString(),
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      lineConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      lineWebhookConfigured: Boolean(process.env.LINE_CHANNEL_SECRET),
      ok: true,
      providers: {
        resend: Boolean(process.env.RESEND_API_KEY),
        line: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
        lineWebhook: Boolean(process.env.LINE_CHANNEL_SECRET),
        webPush: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      },
      supabase: data,
    })
  } catch (error) {
    handleError(res, error)
  }
}
