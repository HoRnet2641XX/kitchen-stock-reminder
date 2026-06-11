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
    code: activeCode?.code,
    expiresAt: activeCode?.expires_at,
    lineDisplayName: linkedLine?.line_display_name || '',
    lineLinked: Boolean(linkedLine?.line_user_id),
    linkedAt: linkedLine?.linked_at || '',
    ok: true,
    status: activeCode?.status || 'linked',
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
      .from('kitchen_line_links')
      .select('code, expires_at, line_display_name, line_user_id, linked_at, status')
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const { data: linkedLine, error: linkedLineError } = await admin
      .from('kitchen_line_links')
      .select('line_display_name, line_user_id, linked_at')
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
      .eq('status', 'linked')
      .not('line_user_id', 'is', null)
      .order('linked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (linkedLineError) throw linkedLineError

    if (latestCode?.status === 'pending' && new Date(latestCode.expires_at).getTime() <= Date.now()) {
      const { data: expiredLink, error: expireError } = await admin
        .from('kitchen_line_links')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('code', latestCode.code)
        .select('code, expires_at, line_display_name, line_user_id, linked_at, status')
        .single()

      if (expireError) throw expireError
      return sendJson(res, 200, toClientStatus(expiredLink, linkedLine))
    }

    sendJson(res, 200, toClientStatus(latestCode, linkedLine))
  } catch (error) {
    handleError(res, error)
  }
}
