import { getSupabaseAdmin, handleError, handleOptions, sendJson } from './_shared.js'

function summarizeProbe(result) {
  if (!result.error) return { ok: true }
  return {
    code: result.error.code || '',
    message: result.error.message || 'unknown error',
    ok: false,
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const admin = getSupabaseAdmin()
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    const projectHost = supabaseUrl ? new URL(supabaseUrl).host : ''

    const profileProbe = await admin.from('kitchen_stock_profiles').select('device_id', { head: true }).limit(1)
    const lineLinkProbe = await admin.from('kitchen_line_links').select('id', { head: true }).limit(1)
    const lineLinkUpdateProbe = await admin
      .from('kitchen_line_links')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')

    sendJson(res, 200, {
      checkedAt: new Date().toISOString(),
      ok: true,
      projectHost,
      probes: {
        lineLinkSelect: summarizeProbe(lineLinkProbe),
        lineLinkUpdate: summarizeProbe(lineLinkUpdateProbe),
        profilesSelect: summarizeProbe(profileProbe),
      },
    })
  } catch (error) {
    handleError(res, error)
  }
}
