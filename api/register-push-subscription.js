import {
  getSupabaseAdmin,
  handleError,
  handleOptions,
  isMissingRelationError,
  readJson,
  requireDeviceSecret,
  sendJson,
  verifyProfile,
} from './_shared.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await readJson(req)
    const { deviceId, secretHash } = requireDeviceSecret(body)
    const subscription = body.subscription
    const endpoint = String(subscription?.endpoint || '')
    if (!endpoint.startsWith('https://')) return sendJson(res, 400, { error: 'invalid_subscription' })

    const admin = getSupabaseAdmin()
    await verifyProfile(admin, deviceId, secretHash)

    const { data: linkedLine, error: linkedLineError } = await admin
      .from('kitchen_line_links')
      .select('line_user_id')
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
      .eq('status', 'linked')
      .not('line_user_id', 'is', null)
      .order('linked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (linkedLineError && !isMissingRelationError(linkedLineError, 'kitchen_line_links')) throw linkedLineError

    const lineValue = String(body.lineMemo || '').trim()
    const explicitWebhookUrl = String(body.webhookUrl || '').trim()
    const webhookUrl = /^https:\/\//.test(lineValue)
      ? lineValue
      : /^https:\/\//.test(explicitWebhookUrl)
        ? explicitWebhookUrl
        : ''
    const manualLineTarget = /^https:\/\//.test(lineValue) ? '' : lineValue
    const lineTarget = linkedLine && !linkedLineError ? linkedLine.line_user_id || manualLineTarget : manualLineTarget

    const { error } = await admin.from('kitchen_push_subscriptions').upsert(
      {
        daily_time: body.dailyTime || '08:00',
        device_id: deviceId,
        email_address: String(body.emailAddress || '').trim() || null,
        endpoint,
        line_target: lineTarget || null,
        secret_hash: secretHash,
        status: 'active',
        subscription,
        timezone: body.timezone || 'Asia/Tokyo',
        updated_at: new Date().toISOString(),
        webhook_url: webhookUrl || null,
      },
      { onConflict: 'endpoint' },
    )

    if (error) throw error

    sendJson(res, 200, {
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      lineConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      lineLinked: Boolean(linkedLine && !linkedLineError && linkedLine.line_user_id),
      ok: true,
      pushEnabled: true,
      webhookEnabled: Boolean(webhookUrl),
    })
  } catch (error) {
    handleError(res, error)
  }
}
