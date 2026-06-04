export type StoragePlace = 'fridge' | 'freezer' | 'pantry'

export type DurationGuide = {
  days: number | null
  label: string
  note?: string
}

export type ReferenceSource = {
  id: string
  name: string
  publisher: string
  url: string
  checked: string
  note: string
}

export type FoodGuide = {
  id: string
  name: string
  category: string
  aliases: string[]
  storage: Partial<Record<StoragePlace, DurationGuide>>
  sourceIds: string[]
  handling: string
}

export const referenceSources: ReferenceSource[] = [
  {
    id: 'foodsafety-cold-chart',
    name: 'Cold Food Storage Chart',
    publisher: 'FoodSafety.gov',
    url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
    checked: '2026-05-21',
    note: '冷蔵と冷凍の保存目安。冷凍の期間は主に品質保持の目安。',
  },
  {
    id: 'foodkeeper-data',
    name: 'FSIS - FoodKeeper Data',
    publisher: 'USDA / Data.gov',
    url: 'https://catalog.data.gov/dataset/fsis-foodkeeper-data',
    checked: '2026-05-21',
    note: 'FoodKeeperアプリの公開データ。Data.gov上では2025-01-22更新。',
  },
  {
    id: 'fda-storage',
    name: 'Are You Storing Food Safely?',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely',
    checked: '2026-05-21',
    note: '冷蔵40°F以下、冷凍0°F以下、冷凍食品の品質低下に関する説明。',
  },
  {
    id: 'maff-expiration',
    name: '消費期限と賞味期限',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syokuiku/kodomo_navi/featured/abc2.html',
    checked: '2026-05-21',
    note: '消費期限と賞味期限の意味、未開封かつ表示どおり保存した場合の前提。',
  },
  {
    id: 'maff-fridge',
    name: '冷蔵庫のかしこい使い方',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/frige.html',
    checked: '2026-05-21',
    note: '購入後すぐの冷蔵・冷凍、肉や魚のドリップ対策、小分け保存の説明。',
  },
  {
    id: 'canada-produce',
    name: 'Storing vegetables and fruits',
    publisher: 'Health Canada',
    url: 'https://www.canada.ca/en/health-canada/services/food-guide/eating-support/kitchen/cooking-skills/storing-vegetables-fruits.html',
    checked: '2026-05-21',
    note: '野菜・果物の保存場所、冷凍に向く食材、冷凍12か月目安の説明。',
  },
]

export const foodGuides: FoodGuide[] = [
  {
    id: 'chicken-pieces',
    name: '鶏肉（生・切り身）',
    category: '肉',
    aliases: ['鶏肉', '鶏もも', '鶏むね', 'チキン', 'とり肉', '鳥肉'],
    storage: {
      fridge: { days: 2, label: '1-2日' },
      freezer: { days: 270, label: '9か月' },
    },
    sourceIds: ['foodsafety-cold-chart', 'maff-fridge'],
    handling: 'ドリップが他の食品に触れないよう包み、小分けして早めに冷蔵・冷凍。',
  },
  {
    id: 'ground-meat',
    name: 'ひき肉',
    category: '肉',
    aliases: ['挽肉', 'ミンチ', '合い挽き', '合挽き', '牛ひき肉', '豚ひき肉'],
    storage: {
      fridge: { days: 2, label: '1-2日' },
      freezer: { days: 90, label: '3-4か月', note: '期限計算は短い側の3か月を採用。' },
    },
    sourceIds: ['foodsafety-cold-chart'],
    handling: '表面積が広く傷みやすいので、購入日ベースで早めに使い切る。',
  },
  {
    id: 'beef-pork-cuts',
    name: '牛・豚の切り身',
    category: '肉',
    aliases: ['牛肉', '豚肉', 'ステーキ', 'ロース', 'バラ肉', 'こま切れ', '豚こま'],
    storage: {
      fridge: { days: 3, label: '3-5日', note: '期限計算は短い側の3日を採用。' },
      freezer: { days: 120, label: '4-12か月', note: '期限計算は短い側の4か月を採用。' },
    },
    sourceIds: ['foodsafety-cold-chart', 'maff-fridge'],
    handling: '用途別に分け、空気を抜いて平らに冷凍すると解凍しやすい。',
  },
  {
    id: 'fatty-fish',
    name: '魚（生・切り身）',
    category: '魚介',
    aliases: ['魚', '鮭', 'サーモン', 'まぐろ', 'マグロ', 'さば', 'サバ', 'ぶり'],
    storage: {
      fridge: { days: 1, label: '1-3日', note: '期限計算は短い側の1日を採用。' },
      freezer: { days: 60, label: '2-3か月', note: '期限計算は短い側の2か月を採用。' },
    },
    sourceIds: ['foodsafety-cold-chart', 'maff-fridge'],
    handling: '汁気を拭き取り、密閉して低温の場所へ。臭いや変色があれば使わない。',
  },
  {
    id: 'shrimp-shellfish',
    name: 'えび・貝類',
    category: '魚介',
    aliases: ['えび', 'エビ', '海老', '貝', 'ほたて', 'ホタテ', 'いか', 'イカ'],
    storage: {
      fridge: { days: 3, label: '3-5日' },
      freezer: { days: 180, label: '6-18か月', note: '期限計算は短い側の6か月を採用。' },
    },
    sourceIds: ['foodsafety-cold-chart'],
    handling: '冷蔵では低温を保ち、加熱用と生食用を分けて扱う。',
  },
  {
    id: 'eggs-shell',
    name: '卵（殻付き）',
    category: '卵・乳',
    aliases: ['卵', 'たまご', '玉子', 'egg'],
    storage: {
      fridge: { days: 21, label: '3-5週間', note: '期限計算は短い側の3週間を採用。' },
      freezer: { days: null, label: '殻付き冷凍は非推奨' },
    },
    sourceIds: ['foodsafety-cold-chart', 'fda-storage'],
    handling: '温度が上がりやすいドアポケットを避け、購入時のパックで冷蔵。',
  },
  {
    id: 'milk',
    name: '牛乳',
    category: '卵・乳',
    aliases: ['牛乳', 'ミルク', 'milk'],
    storage: {
      fridge: { days: 7, label: '7日' },
      freezer: { days: 90, label: '3か月', note: '冷凍すると質感が変わることがあります。' },
    },
    sourceIds: ['foodkeeper-data', 'fda-storage'],
    handling: '開封後はすぐ戻し、ドアポケットより庫内奥側で冷蔵。',
  },
  {
    id: 'yogurt',
    name: 'ヨーグルト',
    category: '卵・乳',
    aliases: ['ヨーグルト', 'yogurt', 'ヨーグルト大'],
    storage: {
      fridge: { days: 7, label: '7-14日', note: '期限計算は短い側の7日を採用。' },
      freezer: { days: 30, label: '1-2か月', note: '冷凍すると食感が変わります。' },
    },
    sourceIds: ['foodkeeper-data', 'fda-storage'],
    handling: '清潔なスプーンを使い、開封後は早めに使い切る。',
  },
  {
    id: 'tofu',
    name: '豆腐',
    category: '大豆',
    aliases: ['豆腐', 'とうふ', '木綿豆腐', '絹豆腐', 'tofu'],
    storage: {
      fridge: { days: 7, label: '約1週間' },
      freezer: { days: 150, label: '約5か月', note: '食感が変わるため加熱料理向き。' },
    },
    sourceIds: ['foodkeeper-data'],
    handling: '開封後は清潔な水に浸して冷蔵し、水は毎日替える。',
  },
  {
    id: 'cooked-rice',
    name: 'ごはん（炊飯後）',
    category: '主食',
    aliases: ['ごはん', 'ご飯', '白米', '炊いた米', '炊飯', '米飯'],
    storage: {
      fridge: { days: 4, label: '4-6日', note: '期限計算は短い側の4日を採用。' },
      freezer: { days: 120, label: '4-6か月', note: '期限計算は短い側の4か月を採用。' },
    },
    sourceIds: ['foodkeeper-data', 'fda-storage'],
    handling: '浅い容器や小分けで早く冷まし、常温放置を避ける。',
  },
  {
    id: 'soup-stew',
    name: '汁物・煮込み',
    category: '作り置き',
    aliases: ['スープ', '味噌汁', 'みそ汁', 'カレー', 'シチュー', '煮物'],
    storage: {
      fridge: { days: 3, label: '3-4日', note: '期限計算は短い側の3日を採用。' },
      freezer: { days: 60, label: '2-3か月', note: '期限計算は短い側の2か月を採用。' },
    },
    sourceIds: ['foodsafety-cold-chart', 'maff-fridge'],
    handling: '鍋のまま放置せず、浅い容器に分けて粗熱を取り、早めに冷蔵・冷凍。',
  },
  {
    id: 'leafy-greens',
    name: '葉物野菜',
    category: '野菜',
    aliases: ['レタス', 'ほうれん草', '小松菜', '水菜', '葉物', 'サラダ菜'],
    storage: {
      fridge: { days: 3, label: '2-3日', note: '状態差が大きいため早めの目安。' },
      freezer: { days: null, label: '生のままは不向き', note: '冷凍する場合は下ゆで・加熱向き。' },
    },
    sourceIds: ['canada-produce'],
    handling: '水分を取り、傷んだ葉を除いて野菜室へ。冷凍は食感変化に注意。',
  },
  {
    id: 'cabbage-carrot',
    name: 'キャベツ・にんじん',
    category: '野菜',
    aliases: ['キャベツ', '人参', 'にんじん', 'ニンジン', '白菜', '大根'],
    storage: {
      fridge: { days: 7, label: '1-2週間', note: '期限計算は短い側の1週間を採用。' },
      freezer: { days: 300, label: '最大12か月', note: '下ゆで・カット後の品質目安。' },
    },
    sourceIds: ['canada-produce'],
    handling: '水分を避け、カット面は包む。冷凍する場合は用途に合わせて下処理。',
  },
  {
    id: 'onion',
    name: '玉ねぎ',
    category: '野菜',
    aliases: ['玉ねぎ', '玉葱', 'タマネギ', 'onion'],
    storage: {
      pantry: { days: 21, label: '2-3週間', note: '涼しく乾いた場所の目安。' },
      fridge: { days: 7, label: 'カット後は約1週間', note: '未カットは常温保存が基本。' },
      freezer: { days: 90, label: '約3か月', note: '加熱料理用にカット冷凍。' },
    },
    sourceIds: ['canada-produce'],
    handling: '未カットは風通しのよい冷暗所。カット後は密閉して冷蔵。',
  },
  {
    id: 'tomato',
    name: 'トマト',
    category: '野菜',
    aliases: ['トマト', 'ミニトマト', 'tomato'],
    storage: {
      pantry: { days: 4, label: '追熟まで数日', note: '熟したら冷蔵へ。' },
      fridge: { days: 2, label: '2-3日', note: '熟した後の目安。' },
      freezer: { days: 60, label: '約2か月', note: 'ソースや加熱料理向き。' },
    },
    sourceIds: ['canada-produce'],
    handling: '未熟なら常温、熟したら冷蔵。冷凍後は生食より加熱料理向き。',
  },
]

export function normalizeFoodText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s/g, '')
}

export function findFoodGuide(query: string) {
  const normalizedQuery = normalizeFoodText(query)
  if (!normalizedQuery) return undefined

  return foodGuides.find((guide) => {
    const candidates = [guide.name, ...guide.aliases].map(normalizeFoodText)
    return candidates.some(
      (candidate) => candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate),
    )
  })
}

export function getSourceById(sourceId: string) {
  return referenceSources.find((source) => source.id === sourceId)
}
