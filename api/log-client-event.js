import { getSupabaseAdmin, handleError, handleOptions, readJson, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await readJson(req)
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('kitchen_client_events').insert({
      device_id: String(body.deviceId || '').slice(0, 120) || null,
      event_type: String(body.eventType || 'client_event').slice(0, 80),
      message: String(body.message || '').slice(0, 1000) || null,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    })
    if (error) throw error
    sendJson(res, 200, { ok: true })
  } catch (error) {
    handleError(res, error)
  }
}
