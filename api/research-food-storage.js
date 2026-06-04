import { handleError, handleOptions, readJson, sendJson } from './_shared.js'

const officialSources = [
  {
    label: 'FoodSafety.gov Cold Food Storage Chart',
    publisher: 'FoodSafety.gov',
    url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
  },
  {
    label: 'FDA Are You Storing Food Safely?',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely',
  },
  {
    label: '農林水産省 消費期限と賞味期限',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syokuiku/kodomo_navi/featured/abc2.html',
  },
  {
    label: '農林水産省 冷蔵庫のかしこい使い方',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/frige.html',
  },
  {
    label: 'Health Canada Storing vegetables and fruits',
    publisher: 'Health Canada',
    url: 'https://www.canada.ca/en/health-canada/services/food-guide/eating-support/kitchen/cooking-skills/storing-vegetables-fruits.html',
  },
]

function normalizeText(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function createSnippet(text, query) {
  const terms = String(query)
    .toLowerCase()
    .split(/[\s　,、]+/)
    .filter((term) => term.length >= 2)
  const lowerText = text.toLowerCase()
  const index = terms.map((term) => lowerText.indexOf(term)).find((position) => position >= 0)
  if (index === undefined || index < 0) return text.slice(0, 180)
  return text.slice(Math.max(0, index - 80), index + 180)
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, {
      headers: {
        accept: 'text/html,application/json',
        'user-agent': 'KitchenStockReminder/1.0 (+https://kitchen-stock-reminder.vercel.app)',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query,
  )}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,product_name_ja,brands,categories_tags,expiration_date,code`
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data.products)
    ? data.products.map((product) => ({
        barcode: product.code || '',
        brands: product.brands || '',
        categories: product.categories_tags || [],
        expirationDate: product.expiration_date || '',
        name: product.product_name_ja || product.product_name || '',
        sourceUrl: product.code ? `https://world.openfoodfacts.org/product/${product.code}` : 'https://world.openfoodfacts.org',
      }))
    : []
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })

  try {
    const { query } = await readJson(req)
    const normalizedQuery = String(query || '').trim()
    if (!normalizedQuery) return sendJson(res, 400, { error: 'query_required' })

    const [sources, productCandidates] = await Promise.all([
      Promise.all(
        officialSources.map(async (source) => {
          try {
            const response = await fetchWithTimeout(source.url)
            const text = normalizeText(await response.text())
            const snippet = createSnippet(text, normalizedQuery)
            const matched = snippet.toLowerCase() !== text.slice(0, 180).toLowerCase()
            return {
              ...source,
              checkedAt: new Date().toISOString(),
              matched,
              ok: response.ok,
              snippet,
              status: response.status,
            }
          } catch (error) {
            return {
              ...source,
              checkedAt: new Date().toISOString(),
              error: error.name === 'AbortError' ? 'timeout' : 'fetch_failed',
              matched: false,
              ok: false,
              snippet: '',
              status: 0,
            }
          }
        }),
      ),
      searchOpenFoodFacts(normalizedQuery).catch(() => []),
    ])

    const reachable = sources.filter((source) => source.ok).length
    const matched = sources.filter((source) => source.matched).length

    sendJson(res, 200, {
      checkedAt: new Date().toISOString(),
      confidence: matched > 0 ? 'medium' : reachable > 0 ? 'low' : 'unknown',
      productCandidates,
      query: normalizedQuery,
      sources,
      summary:
        matched > 0
          ? '公的ソース内で関連語を確認しました。包装表示と保存温度を優先してください。'
          : '公的ソースへ到達しました。食材名が一致しない場合は包装表示と手入力期限を優先してください。',
    })
  } catch (error) {
    handleError(res, error)
  }
}
