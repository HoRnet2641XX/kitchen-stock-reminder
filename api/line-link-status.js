import {
  getSupabaseAdmin,
  handleError,
  handleOptions,
  readJson,
  requireDeviceSecret,
  sendJson,
  verifyProfile,
} from './_shared.js'

function toClientStatus(activeCode, linkedLine) {
  if (!activeCode && !linkedLine) return { lineLinked: false, ok: true, status: 'none' }
  return {
    code: activeCode?.message || activeCode?.metadata?.code,
    expiresAt: activeCode?.metadata?.expiresAt,
    lineDisplayName: linkedLine?.metadata?.lineDisplayName || '',
    lineLinked: Boolean(linkedLine?.metadata?.lineUserId),
    linkedAt: linkedLine?.metadata?.linkedAt || '',
    ok: true,
    status: activeCode?.status || activeCode?.metadata?.status || 'linked',
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await readJson(req)
    const { deviceId, secretHash } = requireDeviceSecret(body)
    const admin = getSupabaseAdmin()
    await verifyProfile(admin, deviceId, secretHash)

    const { data: latestCode, error } = await admin
      .from('kitchen_client_events')
      .select('message, metadata, created_at')
      .eq('device_id', deviceId)
      .eq('event_type', 'line_link_code')
      .eq('metadata->>secretHash', secretHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const { data: linkedLine, error: linkedLineError } = await admin
      .from('kitchen_client_events')
      .select('metadata, created_at')
      .eq('device_id', deviceId)
      .eq('event_type', 'line_linked')
      .eq('metadata->>secretHash', secretHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (linkedLineError) throw linkedLineError

    if (latestCode?.metadata?.expiresAt && new Date(latestCode.metadata.expiresAt).getTime() <= Date.now()) {
      return sendJson(res, 200, toClientStatus({ ...latestCode, status: 'expired' }, linkedLine))
    }

    sendJson(res, 200, toClientStatus(latestCode, linkedLine))
  } catch (error) {
    handleError(res, error)
  }
}
