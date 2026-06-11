import {
  getSupabaseAdmin,
  handleError,
  handleOptions,
  isMissingRelationError,
  readJson,
  requireDeviceSecret,
  sendJson,
} from './_shared.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await readJson(req)
    const { deviceId, secretHash } = requireDeviceSecret(body)
    const admin = getSupabaseAdmin()

    const { count: subscriptionCount, error: subscriptionError } = await admin
      .from('kitchen_push_subscriptions')
      .delete({ count: 'exact' })
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
    if (subscriptionError) throw subscriptionError

    const { count: lineLinkCount, error: lineLinkError } = await admin
      .from('kitchen_line_links')
      .delete({ count: 'exact' })
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
    if (lineLinkError && !isMissingRelationError(lineLinkError, 'kitchen_line_links')) throw lineLinkError

    const { count: profileCount, error: profileError } = await admin
      .from('kitchen_stock_profiles')
      .delete({ count: 'exact' })
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
    if (profileError) throw profileError

    sendJson(res, 200, {
      deletedLineLinks: lineLinkError ? 0 : lineLinkCount || 0,
      deletedProfiles: profileCount || 0,
      deletedSubscriptions: subscriptionCount || 0,
      ok: true,
    })
  } catch (error) {
    handleError(res, error)
  }
}
