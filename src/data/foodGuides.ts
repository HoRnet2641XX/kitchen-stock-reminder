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
    checked: '2026-06-08',
    note: '冷蔵と冷凍の保存目安。冷凍の期間は主に品質保持の目安。',
  },
  {
    id: 'foodkeeper-data',
    name: 'FSIS - FoodKeeper Data',
    publisher: 'USDA / Data.gov',
    url: 'https://catalog.data.gov/dataset/fsis-foodkeeper-data',
    checked: '2026-06-08',
    note: 'FoodKeeperアプリの公開データ。Data.gov上では2025-01-22更新。',
  },
  {
    id: 'fda-storage',
    name: 'Are You Storing Food Safely?',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely',
    checked: '2026-06-08',
    note: '冷蔵40°F以下、冷凍0°F以下、冷凍食品の品質低下に関する説明。',
  },
  {
    id: 'maff-expiration',
    name: '消費期限と賞味期限',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syokuiku/kodomo_navi/featured/abc2.html',
    checked: '2026-06-08',
    note: '消費期限と賞味期限の意味、未開封かつ表示どおり保存した場合の前提。',
  },
  {
    id: 'maff-fridge',
    name: '冷蔵庫のかしこい使い方',
    publisher: '農林水産省',
    url: 'https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/frige.html',
    checked: '2026-06-08',
    note: '購入後すぐの冷蔵・冷凍、肉や魚のドリップ対策、小分け保存の説明。',
  },
  {
    id: 'canada-produce',
    name: 'Storing vegetables and fruits',
    publisher: 'Health Canada',
    url: 'https://www.canada.ca/en/health-canada/services/food-guide/eating-support/kitchen/cooking-skills/storing-vegetables-fruits.html',
    checked: '2026-06-08',
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
  {
    id: 'cucumber-eggplant-pepper',
    name: 'きゅうり・なす・ピーマン',
    category: '野菜',
    aliases: ['きゅうり', 'キュウリ', '胡瓜', 'なす', 'ナス', '茄子', 'ピーマン', 'パプリカ'],
    storage: {
      fridge: { days: 4, label: '3-5日', note: '状態差が大きいため短めに通知。' },
      freezer: { days: 60, label: '約2か月', note: '食感が変わるため加熱料理向き。' },
    },
    sourceIds: ['canada-produce'],
    handling: '水気を拭き、野菜室へ。低温障害や乾燥に注意。',
  },
  {
    id: 'potato-sweet-potato',
    name: 'じゃがいも・さつまいも',
    category: '野菜',
    aliases: ['じゃがいも', 'ジャガイモ', '馬鈴薯', 'さつまいも', 'サツマイモ', '芋'],
    storage: {
      pantry: { days: 21, label: '2-3週間', note: '涼しく暗い場所の目安。芽や緑化に注意。' },
      fridge: { days: null, label: '基本は冷暗所', note: '冷蔵は食味変化に注意。カット後は冷蔵。' },
      freezer: { days: 60, label: '加熱後に約2か月', note: '生冷凍より加熱後の冷凍向き。' },
    },
    sourceIds: ['canada-produce'],
    handling: '直射日光を避ける。芽、緑化、異臭があれば使わない。',
  },
  {
    id: 'mushrooms',
    name: 'きのこ',
    category: '野菜',
    aliases: ['きのこ', 'キノコ', 'しめじ', 'えのき', '舞茸', 'まいたけ', '椎茸', 'しいたけ', 'マッシュルーム'],
    storage: {
      fridge: { days: 4, label: '3-5日', note: '水分に弱いため短めの目安。' },
      freezer: { days: 30, label: '約1か月', note: '石づきを取り、加熱料理用に冷凍。' },
    },
    sourceIds: ['foodkeeper-data', 'canada-produce'],
    handling: '濡らさず冷蔵。ぬめり、強いにおい、変色があれば使わない。',
  },
  {
    id: 'natto',
    name: '納豆',
    category: '大豆',
    aliases: ['納豆', 'なっとう', 'natto'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: '発酵食品でも包装の期限を優先。' },
      freezer: { days: 30, label: '約1か月', note: '品質保持の目安。食感変化に注意。' },
    },
    sourceIds: ['maff-expiration'],
    handling: '包装表示を優先し、冷蔵保存。冷凍後は冷蔵解凍。',
  },
  {
    id: 'ham-sausage',
    name: 'ハム・ソーセージ',
    category: '加工肉',
    aliases: ['ハム', 'ベーコン', 'ソーセージ', 'ウインナー', 'ウィンナー', '加工肉'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: '開封後は早めに使い切る。' },
      freezer: { days: 30, label: '約1か月', note: '品質保持の短め目安。' },
    },
    sourceIds: ['maff-expiration', 'foodkeeper-data'],
    handling: '未開封は包装表示、開封後は密閉して早めに消費。',
  },
  {
    id: 'cheese',
    name: 'チーズ',
    category: '卵・乳',
    aliases: ['チーズ', 'スライスチーズ', 'ピザ用チーズ', '粉チーズ', 'cheese'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: '種類差が大きいため包装表示を優先。' },
      freezer: { days: 60, label: '約2か月', note: '加熱用では冷凍しやすい。' },
    },
    sourceIds: ['maff-expiration', 'foodkeeper-data'],
    handling: 'カビ、異臭、乾燥に注意。ナチュラル/プロセスの表示を確認。',
  },
  {
    id: 'butter-margarine',
    name: 'バター・マーガリン',
    category: '卵・乳',
    aliases: ['バター', 'マーガリン', 'butter'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: 'におい移りを避ける。' },
      freezer: { days: 90, label: '約3か月', note: '小分け冷凍の品質目安。' },
    },
    sourceIds: ['maff-expiration', 'foodkeeper-data'],
    handling: '密閉し、におい移りや酸化を避ける。',
  },
  {
    id: 'bread',
    name: 'パン',
    category: '主食',
    aliases: ['パン', '食パン', 'ロールパン', 'バゲット', 'bread'],
    storage: {
      pantry: { days: null, label: '包装表示優先', note: '気温と湿度で変わる。カビに注意。' },
      freezer: { days: 30, label: '約1か月', note: '食べる分ずつ密閉冷凍。' },
    },
    sourceIds: ['maff-expiration', 'foodkeeper-data'],
    handling: 'カビが出た場合は見える部分だけでなく全体を使わない。',
  },
  {
    id: 'noodles',
    name: '麺類',
    category: '主食',
    aliases: ['うどん', 'そば', '中華麺', '焼きそば麺', 'パスタ', '麺'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: '生麺・ゆで麺・乾麺で大きく異なる。' },
      freezer: { days: 30, label: '約1か月', note: '冷凍対応表示があるものを優先。' },
      pantry: { days: null, label: '乾麺は包装表示優先' },
    },
    sourceIds: ['maff-expiration'],
    handling: '生麺、ゆで麺、乾麺の表示を分けて確認。',
  },
  {
    id: 'deli-ready-to-eat',
    name: '惣菜・弁当',
    category: '惣菜',
    aliases: ['惣菜', '弁当', '唐揚げ', 'コロッケ', 'ポテトサラダ', 'サラダ', 'おかず'],
    storage: {
      fridge: { days: 1, label: '当日-翌日', note: '表示期限と購入時の温度管理を優先。' },
      freezer: { days: null, label: '商品表示優先', note: '冷凍向きでないものもある。' },
    },
    sourceIds: ['maff-expiration', 'fda-storage'],
    handling: '購入後は早く冷蔵。常温放置したものは安全側で判断。',
  },
  {
    id: 'canned-opened',
    name: '缶詰・瓶詰（開封後）',
    category: '加工食品',
    aliases: ['缶詰', 'ツナ缶', 'トマト缶', '瓶詰', 'ジャム', '開封後'],
    storage: {
      fridge: { days: 3, label: '2-4日', note: '別容器に移し替えた後の短め目安。' },
      pantry: { days: null, label: '未開封は包装表示優先' },
    },
    sourceIds: ['fda-storage', 'maff-expiration'],
    handling: '開封後は缶のまま保存せず清潔な容器へ。異臭や膨張に注意。',
  },
  {
    id: 'frozen-commercial',
    name: '市販冷凍食品',
    category: '冷凍食品',
    aliases: ['冷凍食品', '冷凍野菜', '冷凍うどん', '冷凍餃子', '冷凍ごはん'],
    storage: {
      freezer: { days: null, label: '包装表示優先', note: '温度変化や霜付きに注意。' },
    },
    sourceIds: ['maff-expiration', 'fda-storage'],
    handling: '再冷凍は避け、袋の表示と保存温度を優先。',
  },
  {
    id: 'miso-soy-sauce',
    name: '味噌・醤油',
    category: '調味料',
    aliases: ['味噌', 'みそ', '醤油', 'しょうゆ', 'しょう油', 'soy sauce', 'miso'],
    storage: {
      fridge: { days: null, label: '開封後は表示優先', note: '風味劣化を避けるため冷蔵推奨の表示を確認。' },
      pantry: { days: null, label: '未開封は包装表示優先' },
    },
    sourceIds: ['maff-expiration'],
    handling: '開封後の保存場所は商品表示を優先。清潔な器具で取り分ける。',
  },
  {
    id: 'mayonnaise-dressing',
    name: 'マヨネーズ・ドレッシング',
    category: '調味料',
    aliases: ['マヨネーズ', 'ドレッシング', 'タレ', 'たれ', 'ソース'],
    storage: {
      fridge: { days: null, label: '開封後は表示優先', note: '卵・乳成分入りは特に表示を確認。' },
      pantry: { days: null, label: '未開封は包装表示優先' },
    },
    sourceIds: ['maff-expiration'],
    handling: '開封後はキャップ周りを清潔にし、商品表示の温度で保存。',
  },
  {
    id: 'ketchup-sauce',
    name: 'ケチャップ・ソース',
    category: '調味料',
    aliases: ['ケチャップ', '中濃ソース', 'ウスターソース', 'オイスターソース'],
    storage: {
      fridge: { days: null, label: '開封後は表示優先', note: '常温可否は商品差がある。' },
      pantry: { days: null, label: '未開封は包装表示優先' },
    },
    sourceIds: ['maff-expiration'],
    handling: '開封後の冷蔵/常温はラベルを優先し、異臭や分離に注意。',
  },
  {
    id: 'kimchi-pickles',
    name: 'キムチ・漬物',
    category: '加工食品',
    aliases: ['キムチ', '漬物', 'ピクルス', 'たくあん', '浅漬け'],
    storage: {
      fridge: { days: null, label: '包装表示優先', note: '浅漬けは早めに、発酵食品は表示を優先。' },
    },
    sourceIds: ['maff-expiration'],
    handling: '清潔な箸で取り、液漏れや発泡、異臭に注意。',
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
