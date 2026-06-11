import crypto from 'node:crypto'
import {
  getSupabaseAdmin,
  handleError,
  handleOptions,
  readJson,
  requireDeviceSecret,
  sendJson,
  verifyProfile,
} from './_shared.js'

const codeExpiresMinutes = 15

function createLineLinkCode() {
  return `KSR-${crypto.randomInt(100000, 1000000)}`
}

function getLineOfficialAccountUrl() {
  return String(process.env.LINE_OFFICIAL_ACCOUNT_URL || process.env.VITE_LINE_OFFICIAL_ACCOUNT_URL || '').trim()
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const body = await readJson(req)
    const { deviceId, secretHash } = requireDeviceSecret(body)
    const admin = getSupabaseAdmin()
    await verifyProfile(admin, deviceId, secretHash)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + codeExpiresMinutes * 60_000).toISOString()

    await admin
      .from('kitchen_line_links')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('device_id', deviceId)
      .eq('secret_hash', secretHash)
      .eq('status', 'pending')

    let inserted = null
    let insertError = null
    for (let attempt = 0; attempt < 4 && !inserted; attempt += 1) {
      const code = createLineLinkCode()
      const { data, error } = await admin
        .from('kitchen_line_links')
        .insert({
          code,
          device_id: deviceId,
          expires_at: expiresAt,
          secret_hash: secretHash,
          status: 'pending',
        })
        .select('code, expires_at')
        .single()

      if (!error) inserted = data
      insertError = error
      if (error?.code !== '23505') break
    }

    if (!inserted && insertError) throw insertError
    if (!inserted) throw new Error('Could not create LINE link code')

    sendJson(res, 200, {
      code: inserted.code,
      expiresAt: inserted.expires_at,
      lineOfficialAccountUrl: getLineOfficialAccountUrl(),
      ok: true,
    })
  } catch (error) {
    handleError(res, error)
  }
}
