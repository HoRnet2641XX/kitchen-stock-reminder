import { handleError, handleOptions, readJson, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const { barcode } = await readJson(req)
    const code = String(barcode || '').replace(/\D/g, '')
    if (code.length < 8) return sendJson(res, 400, { error: 'invalid_barcode' })

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      code,
    )}.json?fields=product_name,product_name_ja,brands,categories,expiration_date,code`
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await response.json()
    const product = data.product || null

    sendJson(res, 200, {
      barcode: code,
      found: data.status === 1 && Boolean(product),
      productName: product?.product_name_ja || product?.product_name || '',
      brands: product?.brands || '',
      categories: product?.categories || '',
      expirationDate: product?.expiration_date || '',
      sourceUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    })
  } catch (error) {
    handleError(res, error)
  }
}
