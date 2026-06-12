import { type ChangeEvent, type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChefHat,
  CircleHelp,
  ClipboardList,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  Home,
  Link,
  Mail,
  MessageCircle,
  Mic,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShoppingBasket,
  Snowflake,
  Tag,
  Thermometer,
  Trash2,
  Upload,
} from 'lucide-react'
import './App.css'
import {
  findFoodGuide,
  foodGuides,
  getSourceById,
  normalizeFoodText,
  referenceSources,
  type FoodGuide,
  type ReferenceSource,
  type StoragePlace,
} from './data/foodGuides'

type ExpiryType = 'useBy' | 'bestBefore' | 'unknown'
type InventoryFilter = 'active' | StoragePlace | 'used' | 'low'
type AppView = 'today' | 'shopping' | 'add' | 'inventory'
type ItemStatus = 'expired' | 'today' | 'soon' | 'ok' | 'unknown' | 'used' | 'low'
type ShoppingSource = 'manual' | 'missing' | 'used' | 'lowStock'

type ResearchLog = {
  id: string
  query: string
  sourceLabel: string
  url: string
  checkedAt: string
  note: string
}

type InventoryItem = {
  id: string
  name: string
  quantity: string
  storage: StoragePlace
  purchasedAt: string
  guideId?: string
  manualExpiry?: string
  packageExpiry?: string
  expiryType?: ExpiryType
  openedAt?: string
  movedAt?: string
  customLocation?: string
  barcode?: string
  lotCode?: string
  note?: string
  remainingPercent?: number
  remindDays: number
  usedUp: boolean
  createdAt: string
  usedUpAt?: string
  researchLog?: ResearchLog[]
}

type DraftItem = {
  name: string
  quantity: string
  storage: StoragePlace
  purchasedAt: string
  guideId: string
  packageExpiry: string
  expiryType: ExpiryType
  openedAt: string
  movedAt: string
  customLocation: string
  barcode: string
  lotCode: string
  note: string
  remainingPercent: number
  remindDays: number
}

type ItemInsight = {
  item: InventoryItem
  guide?: FoodGuide
  deadline: string | null
  daysLeft: number | null
  status: ItemStatus
  deadlineReason: string
}

type SourceLink = {
  label: string
  publisher: string
  url: string
  checked?: string
  note?: string
}

type LiveResearchSource = {
  checkedAt: string
  error?: string
  label: string
  matched: boolean
  ok: boolean
  publisher: string
  snippet: string
  status: number
  url: string
}

type ProductCandidate = {
  barcode: string
  brands: string
  categories: string[]
  expirationDate: string
  name: string
  sourceUrl: string
}

type LiveResearchResult = {
  checkedAt: string
  confidence: 'medium' | 'low' | 'unknown'
  productCandidates: ProductCandidate[]
  query: string
  sources: LiveResearchSource[]
  summary: string
}

type ReminderSettings = {
  enabled: boolean
  dailyTime: string
  browser: boolean
  emailAddress: string
  lineMemo: string
  serverPush: boolean
  timezone: string
  webhookUrl: string
  lastSentDate?: string
}

type LineLinkCode = {
  code: string
  expiresAt: string
  lineOfficialAccountUrl?: string
}

type LineLinkStatusResponse = {
  code?: string
  expiresAt?: string
  lineDisplayName?: string
  lineLinked: boolean
  linkedAt?: string
  status: 'none' | 'pending' | 'linked' | 'expired'
}

type ShoppingItem = {
  id: string
  name: string
  checked: boolean
  source: ShoppingSource
  createdAt: string
}

type BackupPayload = {
  version: 2
  exportedAt: string
  items: InventoryItem[]
  shoppingItems: ShoppingItem[]
  reminderSettings: ReminderSettings
}

type CloudSyncCredentials = {
  deviceId: string
  secret: string
}

type ReminderSnapshotTarget = {
  deadline: string | null
  id: string
  name: string
  status: ItemStatus
  usedUp: boolean
}

type CloudSyncPayload = BackupPayload & {
  reminderSnapshot?: {
    generatedAt: string
    targets: ReminderSnapshotTarget[]
  }
}

type LegalPanel = 'privacy' | 'terms' | null

const inventoryStorageKey = 'kitchen-stock-reminder:inventory:v2'
const legacyInventoryStorageKey = 'kitchen-stock-reminder:inventory:v1'
const reminderStorageKey = 'kitchen-stock-reminder:reminders:v1'
const shoppingStorageKey = 'kitchen-stock-reminder:shopping:v1'
const tourStorageKey = 'kitchen-stock-reminder:tour:v1'
const cloudSyncStorageKey = 'kitchen-stock-reminder:cloud-sync:v1'
const cloudSyncPausedStorageKey = 'kitchen-stock-reminder:cloud-sync-paused:v1'
const cloudSyncDebounceMs = 900
const expiryAlertLeadDays = 2
const staples = ['卵', '牛乳', '豆腐', '玉ねぎ', 'にんじん', 'キャベツ', '鶏肉', 'ごはん']
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const appApiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/$/, '')
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''
const lineOfficialAccountUrl = import.meta.env.VITE_LINE_OFFICIAL_ACCOUNT_URL?.trim() ?? ''
const supabaseClient =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          storageKey: 'kitchen-stock-reminder:supabase-auth',
        },
      })
    : null

const expiryTypeLabels: Record<ExpiryType, string> = {
  useBy: '消費期限',
  bestBefore: '賞味期限',
  unknown: '期限種別なし',
}

const storageMeta: Record<
  StoragePlace,
  { label: string; icon: typeof Thermometer; className: string; description: string; defaultLocation: string }
> = {
  fridge: {
    label: '冷蔵',
    icon: Thermometer,
    className: 'storage-fridge',
    description: '4度以下の冷蔵庫',
    defaultLocation: '冷蔵庫',
  },
  freezer: {
    label: '冷凍',
    icon: Snowflake,
    className: 'storage-freezer',
    description: '-18度以下の冷凍庫',
    defaultLocation: '冷凍庫',
  },
  pantry: {
    label: '常温',
    icon: Home,
    className: 'storage-pantry',
    description: '冷暗所・常温保管',
    defaultLocation: '常温棚',
  },
}

const statusCopy: Record<ItemStatus, { label: string; className: string }> = {
  expired: { label: '期限超過', className: 'status-expired' },
  today: { label: '今日まで', className: 'status-today' },
  soon: { label: 'そろそろ', className: 'status-soon' },
  ok: { label: '余裕あり', className: 'status-ok' },
  unknown: { label: '手入力待ち', className: 'status-unknown' },
  used: { label: '使い切り', className: 'status-used' },
  low: { label: '残量少', className: 'status-low' },
}

const researchTargets = [
  { label: 'FoodSafety.gov', query: 'site:foodsafety.gov food storage refrigerator freezer' },
  { label: 'USDA FoodKeeper', query: 'site:fsis.usda.gov FoodKeeper storage refrigerator freezer' },
  { label: 'FDA', query: 'site:fda.gov food storage refrigerator freezer' },
  { label: '農林水産省', query: 'site:maff.go.jp 食品 保存 期限 冷蔵 冷凍' },
]

const tourSteps = [
  {
    actionLabel: '通知設定へ移動',
    icon: Bell,
    label: '通知',
    preview: 'LINE連携・Push登録・確認時刻',
    step: '1',
    target: '#notification-settings',
    title: 'まず通知を受け取れる状態にする',
    view: 'inventory' as AppView,
    body: '期限2日前や今日までの食材に気づけるよう、LINE通知とブラウザPushを先に設定します。',
  },
  {
    actionLabel: 'PWA案内へ移動',
    icon: Share2,
    label: 'PWA',
    preview: 'ホーム画面追加・全画面表示・通知',
    step: '2',
    target: '#pwa-guide',
    title: 'スマホのホーム画面から開く',
    view: 'inventory' as AppView,
    body: 'SafariやChromeの共有メニューからホーム画面に追加すると、アプリのように開けます。買い物前や料理前にすぐ確認できます。',
  },
  {
    actionLabel: '確認へ移動',
    icon: AlertTriangle,
    label: '確認',
    preview: '期限超過・今日まで・残量少',
    step: '3',
    target: '#today-check',
    title: '期限が近い食材を見る',
    view: 'today' as AppView,
    body: '開いたら最初に見る場所です。今日動くべき食材だけに絞って、使うか、期限を確認します。',
  },
  {
    actionLabel: '買い物へ移動',
    icon: ShoppingBasket,
    label: '買い物',
    preview: '不足・使い切り・残量少',
    step: '4',
    target: '#shopping-list',
    title: '足りない食材を買い物へ',
    view: 'shopping' as AppView,
    body: '不足した定番食材と使い切った食材をまとめます。買うものを決めたら、次の登録につなげます。',
  },
  {
    actionLabel: '登録へ移動',
    icon: PackagePlus,
    label: '登録',
    preview: '食材名・保存場所・包装期限',
    step: '5',
    target: '#add-food',
    title: '買った食材を登録する',
    view: 'add' as AppView,
    body: '食材名、保存場所、包装の期限を入れるだけで始められます。冷蔵・冷凍の保存目安もここで確認します。',
  },
  {
    actionLabel: '在庫へ移動',
    icon: ClipboardList,
    label: '在庫',
    preview: '保存場所・残量・使い切り',
    step: '6',
    target: '#inventory-list',
    title: '残量と保存場所を更新する',
    view: 'inventory' as AppView,
    body: '登録済みの食材を管理する場所です。残量、保存場所、使い切り、確認ログをここで更新します。',
  },
]

const viewHash: Record<AppView, string> = {
  today: '#today-check',
  shopping: '#shopping-list',
  add: '#add-food',
  inventory: '#inventory-list',
}

function viewFromHash(hash: string): AppView {
  if (hash === '#shopping-list') return 'shopping'
  if (hash === '#add-food') return 'add'
  if (hash === '#inventory-list') return 'inventory'
  return 'today'
}

function todayIso() {
  const date = new Date()
  return toDateInputValue(date)
}

function nowTime() {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value: string, days: number) {
  const date = parseInputDate(value)
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function diffDays(from: string, to: string) {
  const start = parseInputDate(from).getTime()
  const end = parseInputDate(to).getTime()
  return Math.round((end - start) / 86_400_000)
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createSyncSecret() {
  const bytes = new Uint8Array(32)
  globalThis.crypto?.getRandomValues?.(bytes)
  if (bytes.some((byte) => byte !== 0)) {
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  }
  return `${createId()}-${Math.random().toString(16).slice(2)}`
}

function readCloudSyncCredentials(): CloudSyncCredentials {
  if (typeof window === 'undefined') {
    return { deviceId: createId(), secret: createSyncSecret() }
  }

  try {
    const stored = window.localStorage.getItem(cloudSyncStorageKey)
    const parsed = stored ? (JSON.parse(stored) as Partial<CloudSyncCredentials>) : null
    if (parsed?.deviceId && parsed.secret) return { deviceId: parsed.deviceId, secret: parsed.secret }
  } catch {
    window.localStorage.removeItem(cloudSyncStorageKey)
  }

  const nextCredentials = { deviceId: createId(), secret: createSyncSecret() }
  window.localStorage.setItem(cloudSyncStorageKey, JSON.stringify(nextCredentials))
  return nextCredentials
}

function createDraft(partial: Partial<DraftItem> = {}): DraftItem {
  return {
    name: '',
    quantity: '1',
    storage: 'fridge',
    purchasedAt: todayIso(),
    guideId: '',
    packageExpiry: '',
    expiryType: 'unknown',
    openedAt: '',
    movedAt: '',
    customLocation: '',
    barcode: '',
    lotCode: '',
    note: '',
    remainingPercent: 100,
    remindDays: 2,
    ...partial,
  }
}

function createSeedItems(): InventoryItem[] {
  const today = todayIso()

  return [
    {
      id: 'seed-tofu',
      name: '豆腐',
      quantity: '1丁',
      storage: 'fridge',
      purchasedAt: addDays(today, -2),
      openedAt: addDays(today, -1),
      guideId: 'tofu',
      customLocation: '冷蔵庫 上段',
      remainingPercent: 75,
      remindDays: 2,
      usedUp: false,
      createdAt: today,
    },
    {
      id: 'seed-chicken',
      name: '鶏もも肉',
      quantity: '1パック',
      storage: 'freezer',
      purchasedAt: addDays(today, -5),
      movedAt: addDays(today, -5),
      guideId: 'chicken-pieces',
      customLocation: '冷凍庫 下段',
      remainingPercent: 100,
      remindDays: 5,
      usedUp: false,
      createdAt: today,
    },
    {
      id: 'seed-rice',
      name: 'ごはん',
      quantity: '2膳',
      storage: 'fridge',
      purchasedAt: addDays(today, -3),
      guideId: 'cooked-rice',
      customLocation: '冷蔵庫 中段',
      remainingPercent: 40,
      remindDays: 1,
      usedUp: false,
      createdAt: today,
    },
  ]
}

function createDefaultReminderSettings(): ReminderSettings {
  return {
    enabled: false,
    dailyTime: '08:00',
    browser: true,
    emailAddress: '',
    lineMemo: '',
    serverPush: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
    webhookUrl: '',
  }
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as InventoryItem
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.quantity === 'string' &&
    ['fridge', 'freezer', 'pantry'].includes(item.storage) &&
    typeof item.purchasedAt === 'string' &&
    typeof item.remindDays === 'number' &&
    typeof item.usedUp === 'boolean' &&
    typeof item.createdAt === 'string'
  )
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== 'object') return false
  const item = value as ShoppingItem
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.checked === 'boolean' &&
    ['manual', 'missing', 'used', 'lowStock'].includes(item.source) &&
    typeof item.createdAt === 'string'
  )
}

function isCloudSyncPayload(value: unknown): value is CloudSyncPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<CloudSyncPayload>
  return Array.isArray(payload.items) || Array.isArray(payload.shoppingItems) || Boolean(payload.reminderSettings)
}

function createCloudSyncPayload(
  items: InventoryItem[],
  shoppingItems: ShoppingItem[],
  reminderSettings: ReminderSettings,
  snapshotTargets: ReminderSnapshotTarget[] = [],
): CloudSyncPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    items,
    reminderSnapshot: {
      generatedAt: new Date().toISOString(),
      targets: snapshotTargets,
    },
    shoppingItems,
    reminderSettings,
  }
}

async function callAppApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${appApiBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!response.ok) throw new Error(payload.message || payload.error || `API ${response.status}`)
  return payload
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replaceAll('-', '+').replaceAll('_', '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

function isLocalDevApiBaseMissing() {
  if (typeof window === 'undefined' || appApiBaseUrl) return false
  return ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname)
}

function getPushFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('Cloud profile not found')) {
    return 'クラウド保存がまだ作成されていません。数秒後にもう一度Push登録を押してください'
  }
  if (message.includes('Invalid sync credentials')) {
    return '端末キーを確認できませんでした。同期再開かクラウド削除後に再登録してください'
  }
  if (message.includes('Supabase admin environment')) {
    return 'サーバー側のSupabase設定が未完了です'
  }
  if (message.includes('Could not find the table') && message.includes('kitchen_line_links')) {
    return 'SupabaseのREST schema cacheがLINE連携テーブルを認識していません。service_role権限とschema reloadを確認してください'
  }
  if (message.includes('permission denied') && message.includes('kitchen_line_links')) {
    return 'SupabaseのLINE連携テーブルにservice_role権限がありません。grant SQLを実行してください'
  }
  if (message.includes('kitchen_line_links') || message.includes('LINE linking')) {
    return `SupabaseのLINE連携テーブルでエラーが出ています: ${message}`
  }
  if (message.includes('API 404')) {
    return 'ローカルのAPI向き先が未設定です'
  }
  return message || '原因を特定できませんでした'
}

function normalizeOcrDate(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return ''
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return toDateInputValue(new Date(year, month - 1, day))
}

function extractExpiryDate(text: string) {
  const normalized = text.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))

  const fullDate =
    normalized.match(/(20\d{2}|[0-9]{2})\s*[年./-]\s*([01]?\d)\s*[月./-]\s*([0-3]?\d)/) ??
    normalized.match(/(20\d{2}|[0-9]{2})([01]\d)([0-3]\d)/)
  if (fullDate) {
    return normalizeOcrDate(Number(fullDate[1]), Number(fullDate[2]), Number(fullDate[3]))
  }

  const monthDay = normalized.match(/([01]?\d)\s*月\s*([0-3]?\d)\s*日?/)
  if (!monthDay) return ''

  const today = new Date()
  const month = Number(monthDay[1])
  const day = Number(monthDay[2])
  let year = today.getFullYear()
  const candidate = new Date(year, month - 1, day)
  if (candidate.getTime() < today.getTime() - 7 * 86_400_000) year += 1
  return normalizeOcrDate(year, month, day)
}

function guessExpiryTypeFromText(text: string): ExpiryType {
  if (text.includes('消費')) return 'useBy'
  if (text.includes('賞味')) return 'bestBefore'
  return 'unknown'
}

function readInventory() {
  if (typeof window === 'undefined') return createSeedItems()

  try {
    const stored =
      window.localStorage.getItem(inventoryStorageKey) ??
      window.localStorage.getItem(legacyInventoryStorageKey)
    if (!stored) return createSeedItems()
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return createSeedItems()
    const items = parsed.filter(isInventoryItem).map((item) => ({
      ...item,
      packageExpiry: item.packageExpiry ?? item.manualExpiry,
      expiryType: item.expiryType ?? 'unknown',
      remainingPercent: item.remainingPercent ?? 100,
      customLocation: item.customLocation ?? storageMeta[item.storage].defaultLocation,
      researchLog: item.researchLog ?? [],
    }))
    return items.length > 0 ? items : createSeedItems()
  } catch {
    window.localStorage.removeItem(inventoryStorageKey)
    return createSeedItems()
  }
}

function readReminderSettings() {
  if (typeof window === 'undefined') return createDefaultReminderSettings()

  try {
    const stored = window.localStorage.getItem(reminderStorageKey)
    if (!stored) return createDefaultReminderSettings()
    const parsed = JSON.parse(stored) as Partial<ReminderSettings>
    const storedLineMemo = String(parsed.lineMemo || '').trim()
    const storedWebhookUrl = String(parsed.webhookUrl || '').trim()
    return {
      ...createDefaultReminderSettings(),
      ...parsed,
      enabled: Boolean(parsed.enabled),
      browser: parsed.browser !== false,
      serverPush: Boolean(parsed.serverPush),
      dailyTime: parsed.dailyTime && /^\d{2}:\d{2}$/.test(parsed.dailyTime) ? parsed.dailyTime : '08:00',
      lineMemo: '',
      timezone: parsed.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
      webhookUrl: storedWebhookUrl || (storedLineMemo.startsWith('https://') ? storedLineMemo : ''),
    }
  } catch {
    window.localStorage.removeItem(reminderStorageKey)
    return createDefaultReminderSettings()
  }
}

function readShoppingItems() {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(shoppingStorageKey)
    if (!stored) return []
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isShoppingItem)
  } catch {
    window.localStorage.removeItem(shoppingStorageKey)
    return []
  }
}

function getGuide(item: InventoryItem) {
  return foodGuides.find((guide) => guide.id === item.guideId) ?? findFoodGuide(item.name)
}

function getStorageBaseDate(item: InventoryItem) {
  if (item.storage === 'freezer') return item.movedAt || item.purchasedAt
  return item.openedAt || item.movedAt || item.purchasedAt
}

function earliestDate(dates: Array<{ date: string; reason: string }>) {
  const validDates = dates.filter((candidate) => candidate.date)
  if (validDates.length === 0) return null
  return validDates.sort((a, b) => a.date.localeCompare(b.date))[0]
}

function getDeadlineDetail(item: InventoryItem, guide?: FoodGuide) {
  const guideDuration = guide?.storage[item.storage]
  const guideDeadline =
    guideDuration?.days !== null && guideDuration?.days !== undefined
      ? addDays(getStorageBaseDate(item), guideDuration.days)
      : ''

  const explicitDeadline = item.packageExpiry || item.manualExpiry || ''
  const winner = earliestDate([
    { date: explicitDeadline, reason: item.expiryType ? expiryTypeLabels[item.expiryType] : '期限表示' },
    { date: guideDeadline, reason: `${storageMeta[item.storage].label}の保存目安` },
  ])

  return {
    deadline: winner?.date ?? null,
    reason: winner?.reason ?? '期限データなし',
  }
}

function getStatus(item: InventoryItem, daysLeft: number | null): ItemStatus {
  if (item.usedUp) return 'used'
  if ((item.remainingPercent ?? 100) <= 25) return 'low'
  if (daysLeft === null) return 'unknown'
  if (daysLeft < 0) return 'expired'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= Math.max(item.remindDays ?? 0, expiryAlertLeadDays)) return 'soon'
  return 'ok'
}

function createReminderSnapshotTargets(items: InventoryItem[], currentDay: string): ReminderSnapshotTarget[] {
  return items
    .map((item) => {
      const guide = getGuide(item)
      const detail = getDeadlineDetail(item, guide)
      const daysLeft = detail.deadline ? diffDays(currentDay, detail.deadline) : null
      return {
        deadline: detail.deadline,
        id: item.id,
        name: item.name,
        status: getStatus(item, daysLeft),
        usedUp: item.usedUp,
      }
    })
    .filter((target) => !target.usedUp)
}

function formatDate(value: string | null) {
  if (!value) return '未設定'
  const [year, month, day] = value.split('-')
  return `${year}/${month}/${day}`
}

function formatDateTime(value: string | undefined) {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未設定'
  return date.toLocaleString('ja-JP', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  })
}

function formatDaysLeft(daysLeft: number | null) {
  if (daysLeft === null) return '期限未設定'
  if (daysLeft < 0) return `${Math.abs(daysLeft)}日超過`
  if (daysLeft === 0) return '今日'
  return `あと${daysLeft}日`
}

function getDeadlineUrgencyPercent(daysLeft: number | null) {
  if (daysLeft === null) return 24
  if (daysLeft < 0) return 100
  if (daysLeft === 0) return 92
  if (daysLeft <= 2) return 82
  if (daysLeft <= 7) return 58
  if (daysLeft <= 14) return 36
  return 18
}

function sortInsights(a: ItemInsight, b: ItemInsight) {
  if (a.item.usedUp !== b.item.usedUp) return a.item.usedUp ? 1 : -1
  if (!a.deadline && !b.deadline) return a.item.name.localeCompare(b.item.name, 'ja')
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return a.deadline.localeCompare(b.deadline)
}

function matchStaple(item: InventoryItem, staple: string) {
  const normalizedStaple = normalizeFoodText(staple)
  const normalizedName = normalizeFoodText(item.name)
  const stapleGuide = findFoodGuide(staple)

  return (
    normalizedName.includes(normalizedStaple) ||
    normalizedStaple.includes(normalizedName) ||
    Boolean(stapleGuide && item.guideId === stapleGuide.id)
  )
}

function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function currentMinutes() {
  const date = new Date()
  return date.getHours() * 60 + date.getMinutes()
}

function getResearchLinks(query: string) {
  const normalizedQuery = query.trim() || '食材'
  return researchTargets.map((target) => {
    const searchQuery = `${target.query} ${normalizedQuery}`
    return {
      label: target.label,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
    }
  })
}

function getGuideSources(guide?: FoodGuide) {
  if (!guide) return []
  return guide.sourceIds.map((sourceId) => getSourceById(sourceId)).filter((source): source is ReferenceSource => Boolean(source))
}

function getSourceLinks(guide: FoodGuide | undefined, fallbackQuery: string): SourceLink[] {
  const guideSources = getGuideSources(guide)
  if (guideSources.length > 0) {
    return guideSources.map((source) => ({
      label: source.publisher,
      publisher: source.publisher,
      url: source.url,
      checked: source.checked,
      note: source.note,
    }))
  }

  return getResearchLinks(fallbackQuery).map((target) => ({
    label: target.label,
    publisher: target.label,
    url: target.url,
    note: '公的ソース検索',
  }))
}

function getSourceSummary(guide?: FoodGuide) {
  const sources = getGuideSources(guide)
  if (sources.length === 0) {
    return {
      checked: '',
      label: '参照元未照合',
      note: '食材名から公的ソース検索で確認してください',
    }
  }

  const label = sources.length > 1 ? `${sources[0]?.publisher ?? '参照元'} ほか${sources.length - 1}件` : sources[0]?.publisher ?? '参照元'

  return {
    checked: sources.map((source) => source.checked).sort().at(-1) ?? '',
    label,
    note: guide?.handling ?? sources[0]?.note ?? '',
  }
}

function getDeadlineReasonDetail(reason: string, sourceSummary: ReturnType<typeof getSourceSummary>) {
  if (reason === '消費期限' || reason === '賞味期限') return `包装表示を優先 / 参照: ${sourceSummary.label}`
  if (reason === '期限種別なし') return `包装の期限を優先 / 参照: ${sourceSummary.label}`
  if (sourceSummary.checked) return `${reason} / ${sourceSummary.label} (${sourceSummary.checked}確認)`
  return `${reason} / ${sourceSummary.label}`
}

function getEvidenceSummary(reason: string, sourceSummary: ReturnType<typeof getSourceSummary>) {
  if (reason === '消費期限' || reason === '賞味期限' || reason === '期限種別なし') {
    return {
      className: 'is-package',
      detail: '商品の表示を優先',
      label: '包装表示',
    }
  }

  if (sourceSummary.checked) {
    return {
      className: 'is-guide',
      detail: sourceSummary.label,
      label: '保存目安',
    }
  }

  return {
    className: 'is-unknown',
    detail: '参照元を確認してください',
    label: '要確認',
  }
}

function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function getNotificationPermissionLabel(permission: NotificationPermission | 'unsupported') {
  if (permission === 'granted') return 'ブラウザ通知 許可済み'
  if (permission === 'denied') return 'ブラウザ通知 ブロック中'
  if (permission === 'default') return 'ブラウザ通知 未許可'
  return 'ブラウザ通知 非対応'
}

function createShoppingItem(name: string, source: ShoppingSource): ShoppingItem {
  return {
    id: createId(),
    name,
    checked: false,
    source,
    createdAt: todayIso(),
  }
}

function getRecipeIdeas(insights: ItemInsight[]) {
  const activeNames = insights.filter((insight) => !insight.item.usedUp).map((insight) => insight.item.name)
  const urgentNames = insights
    .filter((insight) => ['expired', 'today', 'soon', 'low'].includes(insight.status))
    .map((insight) => insight.item.name)
  const names = activeNames.map(normalizeFoodText).join(' ')

  const ideas = [
    {
      title: '期限近い食材の炒めもの',
      ingredients: urgentNames.slice(0, 3),
      note: '野菜・肉・豆腐を一気に消費しやすい定番です。',
    },
    {
      title: names.includes('ごはん') || names.includes('卵') ? '残りごはんの卵チャーハン' : '冷蔵庫整理スープ',
      ingredients: activeNames.slice(0, 4),
      note: '少量の食材をまとめて使えます。',
    },
    {
      title: names.includes('豆腐') ? '豆腐と野菜のあんかけ' : '冷凍ストックの下味焼き',
      ingredients: urgentNames.length > 0 ? urgentNames.slice(0, 2) : activeNames.slice(0, 2),
      note: '冷凍・冷蔵の境目にある食材を優先します。',
    },
  ]

  return ideas.filter((idea) => idea.ingredients.length > 0)
}

function buildShareText(insights: ItemInsight[], shoppingItems: ShoppingItem[]) {
  const lines = [
    '食材期限帳',
    '',
    '在庫',
    ...insights
      .filter((insight) => !insight.item.usedUp)
      .map(
        (insight) =>
          `- ${insight.item.name} ${insight.item.quantity} / ${storageMeta[insight.item.storage].label} / ${formatDaysLeft(
            insight.daysLeft,
          )}`,
      ),
    '',
    '買うもの',
    ...shoppingItems.filter((item) => !item.checked).map((item) => `- ${item.name}`),
  ]
  return lines.join('\n')
}

function App() {
  const [items, setItems] = useState<InventoryItem[]>(readInventory)
  const [draft, setDraft] = useState<DraftItem>(() => createDraft())
  const [filter, setFilter] = useState<InventoryFilter>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [manualShoppingName, setManualShoppingName] = useState('')
  const [researchMessage, setResearchMessage] = useState('食材名を入れて期限リサーチ')
  const [liveResearch, setLiveResearch] = useState<LiveResearchResult | null>(null)
  const [researchBusy, setResearchBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [pushActionStatus, setPushActionStatus] = useState('')
  const [pushActionBusy, setPushActionBusy] = useState<'register' | 'server' | null>(null)
  const [lineLinkBusy, setLineLinkBusy] = useState<'create' | 'check' | null>(null)
  const [lineLinkCode, setLineLinkCode] = useState<LineLinkCode | null>(null)
  const [lineLinkStatus, setLineLinkStatus] = useState('')
  const [lineLinked, setLineLinked] = useState(false)
  const [lineDisplayName, setLineDisplayName] = useState('')
  const [voiceState, setVoiceState] = useState('音声入力')
  const [ocrState, setOcrState] = useState('期限OCR')
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(readReminderSettings)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermissionState,
  )
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(readShoppingItems)
  const [tourOpen, setTourOpen] = useState(() => window.localStorage.getItem(tourStorageKey) !== 'done')
  const [tourStep, setTourStep] = useState(0)
  const [activeView, setActiveView] = useState<AppView>(() => viewFromHash(window.location.hash))
  const [cloudSyncCredentials] = useState<CloudSyncCredentials>(readCloudSyncCredentials)
  const [cloudSyncPaused, setCloudSyncPaused] = useState(
    () => window.localStorage.getItem(cloudSyncPausedStorageKey) === 'true',
  )
  const [cloudSyncReady, setCloudSyncReady] = useState(() => !supabaseClient || cloudSyncPaused)
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() =>
    cloudSyncPaused ? 'ローカル保存中' : supabaseClient ? 'クラウド同期 準備中' : 'ローカル保存中',
  )
  const [accountEmail, setAccountEmail] = useState('')
  const [sessionEmail, setSessionEmail] = useState('')
  const [accountStatus, setAccountStatus] = useState(supabaseClient ? '未ログイン' : 'アカウント同期なし')
  const [legalPanel, setLegalPanel] = useState<LegalPanel>(null)
  const currentDay = todayIso()

  useEffect(() => {
    window.localStorage.setItem(inventoryStorageKey, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    window.localStorage.setItem(reminderStorageKey, JSON.stringify(reminderSettings))
  }, [reminderSettings])

  useEffect(() => {
    window.localStorage.setItem(shoppingStorageKey, JSON.stringify(shoppingItems))
  }, [shoppingItems])

  useEffect(() => {
    if (!supabaseClient || cloudSyncPaused) return

    const client = supabaseClient
    let ignore = false

    async function loadCloudState() {
      setCloudSyncStatus('クラウド同期 読み込み中')
      const { data, error } = await client.rpc('get_kitchen_stock_state', {
        p_device_id: cloudSyncCredentials.deviceId,
        p_secret: cloudSyncCredentials.secret,
      })

      if (ignore) return

      if (error) {
        setCloudSyncStatus('クラウド同期エラー / ローカル保存中')
        setCloudSyncReady(true)
        return
      }

      if (isCloudSyncPayload(data)) {
        if (Array.isArray(data.items)) {
          const nextItems = data.items.filter(isInventoryItem)
          setItems(nextItems)
        }
        if (Array.isArray(data.shoppingItems)) setShoppingItems(data.shoppingItems.filter(isShoppingItem))
        if (data.reminderSettings) {
          setReminderSettings({ ...createDefaultReminderSettings(), ...data.reminderSettings })
        }
        setCloudSyncStatus('クラウド同期済み')
      } else {
        setCloudSyncStatus('クラウド同期 準備完了')
      }

      setCloudSyncReady(true)
    }

    void loadCloudState()

    return () => {
      ignore = true
    }
  }, [cloudSyncCredentials, cloudSyncPaused])

  useEffect(() => {
    if (!supabaseClient || !cloudSyncReady || cloudSyncPaused) return

    const client = supabaseClient
    const timerId = window.setTimeout(() => {
      const payload = createCloudSyncPayload(
        items,
        shoppingItems,
        reminderSettings,
        createReminderSnapshotTargets(items, currentDay),
      )
      void client
        .rpc('upsert_kitchen_stock_state', {
          p_device_id: cloudSyncCredentials.deviceId,
          p_payload: payload,
          p_secret: cloudSyncCredentials.secret,
        })
        .then(({ error }) => {
          if (error) {
            setCloudSyncStatus('クラウド同期エラー / ローカル保存中')
            return
          }
          setCloudSyncStatus(`クラウド同期済み ${nowTime()}`)
        })
    }, cloudSyncDebounceMs)

    return () => window.clearTimeout(timerId)
  }, [cloudSyncCredentials, cloudSyncPaused, cloudSyncReady, currentDay, items, reminderSettings, shoppingItems])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  useEffect(() => {
    if (!supabaseClient) return

    void supabaseClient.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email ?? ''
      setSessionEmail(email)
      setAccountEmail((current) => current || email)
      setAccountStatus(email ? 'ログイン済み' : '未ログイン')
    })

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const email = session?.user.email ?? ''
      setSessionEmail(email)
      setAccountEmail((current) => current || email)
      setAccountStatus(email ? 'ログイン済み' : '未ログイン')
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function reportClientEvent(
      eventType: string,
      message: string,
      metadata: Record<string, unknown> = {},
    ) {
      try {
        await callAppApi('/api/log-client-event', {
          deviceId: cloudSyncCredentials.deviceId,
          eventType,
          message,
          metadata,
        })
      } catch {
        // Monitoring must never interrupt cooking-time flows.
      }
    }

    function handleWindowError(event: ErrorEvent) {
      void reportClientEvent('window_error', event.message, {
        colno: event.colno,
        filename: event.filename,
        lineno: event.lineno,
      })
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void reportClientEvent('unhandled_rejection', String(event.reason ?? 'unknown rejection'))
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [cloudSyncCredentials.deviceId])

  useEffect(() => {
    function handleHashChange() {
      setActiveView(viewFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!tourOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      window.localStorage.setItem(tourStorageKey, 'done')
      setTourOpen(false)
      setTourStep(0)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tourOpen])

  const selectedGuide = useMemo(() => {
    return foodGuides.find((guide) => guide.id === draft.guideId) ?? findFoodGuide(draft.name)
  }, [draft.guideId, draft.name])

  const draftDuration = selectedGuide?.storage[draft.storage]
  const draftGuideDeadline =
    draftDuration?.days !== null && draftDuration?.days !== undefined
      ? addDays(draft.movedAt || draft.openedAt || draft.purchasedAt, draftDuration.days)
      : ''
  const draftDeadlineDetail = earliestDate([
    { date: draft.packageExpiry, reason: expiryTypeLabels[draft.expiryType] },
    { date: draftGuideDeadline, reason: `${storageMeta[draft.storage].label}の保存目安` },
  ])
  const draftDeadline = draftDeadlineDetail?.date ?? ''
  const draftSourceLinks = getSourceLinks(selectedGuide, draft.name || selectedGuide?.name || '')
  const draftSourceSummary = getSourceSummary(selectedGuide)

  const insights = useMemo<ItemInsight[]>(() => {
    return items
      .map((item) => {
        const guide = getGuide(item)
        const detail = getDeadlineDetail(item, guide)
        const daysLeft = detail.deadline ? diffDays(currentDay, detail.deadline) : null
        const status = getStatus(item, daysLeft)
        return { item, guide, deadline: detail.deadline, daysLeft, status, deadlineReason: detail.reason }
      })
      .sort(sortInsights)
  }, [currentDay, items])

  const activeInsights = insights.filter((insight) => !insight.item.usedUp)
  const alertInsights = activeInsights.filter((insight) =>
    ['expired', 'today', 'soon', 'unknown', 'low'].includes(insight.status),
  )
  const deadlineLeadAlerts = activeInsights.filter((insight) => insight.daysLeft === expiryAlertLeadDays)

  const visibleInsights = insights.filter((insight) => {
    const normalizedSearch = normalizeFoodText(searchTerm)
    const matchesSearch =
      !normalizedSearch ||
      normalizeFoodText(insight.item.name).includes(normalizedSearch) ||
      normalizeFoodText(insight.guide?.name ?? '').includes(normalizedSearch) ||
      normalizeFoodText(insight.item.barcode ?? '').includes(normalizedSearch) ||
      normalizeFoodText(insight.item.customLocation ?? '').includes(normalizedSearch)

    if (!matchesSearch) return false
    if (filter === 'active') return !insight.item.usedUp
    if (filter === 'used') return insight.item.usedUp
    if (filter === 'low') return !insight.item.usedUp && (insight.item.remainingPercent ?? 100) <= 25
    return !insight.item.usedUp && insight.item.storage === filter
  })

  const missingStaples = staples.filter(
    (staple) => !items.some((item) => !item.usedUp && matchStaple(item, staple)),
  )

  const usedUpNames = Array.from(
    new Set(items.filter((item) => item.usedUp).map((item) => item.name.trim()).filter(Boolean)),
  )

  const lowStockNames = Array.from(
    new Set(
      items
        .filter((item) => !item.usedUp && (item.remainingPercent ?? 100) <= 25)
        .map((item) => item.name.trim())
        .filter(Boolean),
    ),
  )

  const derivedShoppingItems = [
    ...missingStaples.map((name) => createShoppingItem(name, 'missing')),
    ...usedUpNames.map((name) => createShoppingItem(name, 'used')),
    ...lowStockNames.map((name) => createShoppingItem(name, 'lowStock')),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.name === item.name) === index)

  const visibleShoppingItems = [...shoppingItems, ...derivedShoppingItems].filter(
    (item, index, all) => !item.checked && all.findIndex((candidate) => candidate.name === item.name) === index,
  )

  const totalActive = activeInsights.length
  const recipeIdeas = getRecipeIdeas(insights)
  const firstAttention = alertInsights[0]
  const radarInsights = activeInsights.slice(0, 4)
  const shoppingTodoCount = visibleShoppingItems.length
  const reminderTargetCount = alertInsights.filter((insight) => insight.status !== 'unknown').length
  const localDevApiMissing = isLocalDevApiBaseMissing()
  const notificationBlocked = notificationPermission === 'denied'
  const pushSetupLabel = notificationBlocked
    ? '通知ブロック中'
    : !vapidPublicKey
    ? '公開鍵未設定'
    : localDevApiMissing
      ? 'API未設定'
      : !supabaseClient
        ? 'クラウド未設定'
        : cloudSyncPaused
          ? '同期停止中'
          : cloudSyncReady
            ? '準備OK'
            : '同期準備中'
  const pushSetupText =
    pushSetupLabel === '通知ブロック中'
      ? 'ブラウザのサイト設定から通知を許可してから、もう一度Push登録を押してください。'
      : pushSetupLabel === '準備OK'
      ? 'Push登録前に在庫をクラウドへ保存してから、閉じていても届く通知を登録します。'
      : 'Push登録には公開鍵、API、クラウド同期、通知許可が必要です。'
  const nextActionView: AppView = firstAttention ? 'today' : 'add'
  const nextActionLabel = firstAttention ? '確認する' : '登録する'
  const secondaryActionView: AppView = shoppingTodoCount > 0 ? 'shopping' : 'inventory'
  const secondaryActionLabel = shoppingTodoCount > 0 ? '買い物を見る' : '在庫を見る'
  const tourStepData = tourSteps[tourStep] ?? tourSteps[0]
  const activeLineOfficialAccountUrl = lineLinkCode?.lineOfficialAccountUrl || lineOfficialAccountUrl
  const lineNotificationReady = lineLinked || Boolean(reminderSettings.webhookUrl)
  const pushNotificationReady = reminderSettings.serverPush
  const notificationSetupNeeded = !lineNotificationReady || !pushNotificationReady
  const lineLinkLabel = lineLinked
    ? lineDisplayName
      ? `${lineDisplayName} と連携済み`
      : '連携済み'
    : lineLinkCode
      ? 'コード発行済み'
      : '未連携'
  const notificationReadyCount =
    (lineNotificationReady ? 1 : 0) + (pushNotificationReady ? 1 : 0) + (reminderSettings.enabled ? 1 : 0)
  const notificationReadinessLabel = `${notificationReadyCount}/3`
  const focusKicker = notificationSetupNeeded ? '初回の3分' : '今日の台所'
  const focusTitle = notificationSetupNeeded
    ? '期限通知を先に整える'
    : firstAttention
      ? `${firstAttention.item.name}から使う`
      : '買ったら、しまう前に登録'
  const focusSubtext = notificationSetupNeeded
    ? 'LINEとPushを済ませると、期限2日前と当日に見落としを防げます。'
    : firstAttention
      ? `${formatDaysLeft(firstAttention.daysLeft)}。使う、確認する、買い足すをここで判断します。`
      : '冷蔵・冷凍・常温の保存目安を見ながら、食材を一つずつ残します。'
  const primaryActionLabel = notificationSetupNeeded ? '通知を整える' : nextActionLabel

  const refreshLineLinkStatus = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (localDevApiMissing) {
        if (!silent) setLineLinkStatus('ローカルのAPI向き先が未設定です')
        return null
      }
      if (!supabaseClient) {
        if (!silent) setLineLinkStatus('LINE連携にはクラウド同期設定が必要です')
        return null
      }
      if (cloudSyncPaused) {
        if (!silent) setLineLinkStatus('クラウド同期を再開してからLINE連携してください')
        return null
      }

      if (!silent) setLineLinkBusy('check')
      try {
        const result = await callAppApi<LineLinkStatusResponse>('/api/line-link-status', {
          deviceId: cloudSyncCredentials.deviceId,
          secret: cloudSyncCredentials.secret,
        })

        if (result.code && result.expiresAt) {
          setLineLinkCode((current) => ({
            code: result.code || current?.code || '',
            expiresAt: result.expiresAt || current?.expiresAt || '',
            lineOfficialAccountUrl: current?.lineOfficialAccountUrl || lineOfficialAccountUrl,
          }))
        }

        setLineLinked(result.lineLinked)
        setLineDisplayName(result.lineDisplayName || '')

        if (result.lineLinked && result.status === 'pending') {
          if (!silent) {
            setLineLinkStatus('LINE通知は連携済みです。別のLINEに替える場合は、このコードを送信してください')
          }
        } else if (result.lineLinked) {
          setLineLinkStatus(
            result.lineDisplayName
              ? `${result.lineDisplayName} と連携しました`
              : 'LINE通知の連携が完了しました',
          )
        } else if (result.status === 'pending' && !silent) {
          setLineLinkStatus('LINE公式にコードを送信すると、ここが連携済みに変わります')
        } else if (result.status === 'expired') {
          setLineLinkStatus('連携コードの期限が切れました。新しいコードを発行してください')
        } else if (!silent) {
          setLineLinkStatus('まだLINE連携はありません。先に連携コードを作ってください')
        }

        return result
      } catch (error) {
        if (!silent) setLineLinkStatus(`LINE連携の確認に失敗: ${getPushFailureMessage(error)}`)
        return null
      } finally {
        if (!silent) setLineLinkBusy(null)
      }
    },
    [cloudSyncCredentials.deviceId, cloudSyncCredentials.secret, cloudSyncPaused, localDevApiMissing],
  )

  useEffect(() => {
    if (!cloudSyncReady) return
    const timeoutId = window.setTimeout(() => {
      void refreshLineLinkStatus({ silent: true })
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [cloudSyncReady, refreshLineLinkStatus])

  useEffect(() => {
    if (!lineLinkCode || lineLinked) return

    const expiresAt = new Date(lineLinkCode.expiresAt).getTime()
    if (expiresAt <= Date.now()) return

    const intervalId = window.setInterval(() => {
      if (new Date(lineLinkCode.expiresAt).getTime() <= Date.now()) {
        setLineLinkStatus('連携コードの期限が切れました。新しいコードを発行してください')
        window.clearInterval(intervalId)
        return
      }
      void refreshLineLinkStatus({ silent: true })
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [lineLinkCode, lineLinked, refreshLineLinkStatus])

  function switchView(view: AppView) {
    setActiveView(view)
    window.history.replaceState(null, '', viewHash[view])
  }

  function openSupportDrawerTarget(targetSelector: string) {
    switchView('inventory')
    window.setTimeout(() => {
      const drawer = document.querySelector<HTMLDetailsElement>('.support-drawer')
      if (drawer) drawer.open = true
      const target = document.querySelector<HTMLElement>(targetSelector)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function openNotificationSetup() {
    openSupportDrawerTarget('#notification-settings')
  }

  function openTour() {
    setTourStep(0)
    setTourOpen(true)
  }

  function closeTour() {
    window.localStorage.setItem(tourStorageKey, 'done')
    setTourOpen(false)
    setTourStep(0)
  }

  function goToNextTourStep() {
    if (tourStep >= tourSteps.length - 1) {
      closeTour()
      return
    }
    setTourStep((current) => Math.min(current + 1, tourSteps.length - 1))
  }

  function goToPreviousTourStep() {
    setTourStep((current) => Math.max(current - 1, 0))
  }

  function goToTourTarget() {
    if (tourStepData.target === '#notification-settings' || tourStepData.target === '#pwa-guide') {
      closeTour()
      openSupportDrawerTarget(tourStepData.target)
      return
    }
    switchView(tourStepData.view)
    closeTour()
  }

  async function handleResearch() {
    const guide = findFoodGuide(draft.name)
    if (!guide) {
      setDraft((current) => ({ ...current, guideId: '' }))
      setResearchMessage('一致する内蔵データなし。公的ソース検索リンクで確認できます')
    } else {
      setDraft((current) => ({ ...current, guideId: guide.id }))
      setResearchMessage(`${guide.name} の保存目安を適用中`)
    }

    const query = draft.name.trim() || guide?.name || ''
    if (!query) return

    setResearchBusy(true)
    try {
      const result = await callAppApi<LiveResearchResult>('/api/research-food-storage', { query })
      setLiveResearch(result)
      const matchedCount = result.sources.filter((source) => source.matched).length
      setResearchMessage(
        matchedCount > 0
          ? `実リサーチ完了: ${matchedCount}件の参照元で関連語を確認`
          : '実リサーチ完了: 参照元へ到達、包装表示を優先',
      )
    } catch {
      setResearchMessage(guide ? `${guide.name} の保存目安を適用中` : '公的ソース検索リンクで確認できます')
      setNotice('実リサーチAPIに接続できませんでした。内蔵データで続行できます')
    } finally {
      setResearchBusy(false)
    }
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = draft.name.trim()
    if (!trimmedName) return

    const guide = foodGuides.find((itemGuide) => itemGuide.id === draft.guideId) ?? findFoodGuide(trimmedName)
    const nextItem: InventoryItem = {
      id: createId(),
      name: trimmedName,
      quantity: draft.quantity.trim() || '1',
      storage: draft.storage,
      purchasedAt: draft.purchasedAt,
      guideId: guide?.id,
      packageExpiry: draft.packageExpiry || undefined,
      manualExpiry: draft.packageExpiry || undefined,
      expiryType: draft.expiryType,
      openedAt: draft.openedAt || undefined,
      movedAt: draft.movedAt || undefined,
      customLocation: draft.customLocation || storageMeta[draft.storage].defaultLocation,
      barcode: draft.barcode || undefined,
      lotCode: draft.lotCode || undefined,
      note: draft.note || undefined,
      remainingPercent: draft.remainingPercent,
      remindDays: Math.max(0, draft.remindDays),
      usedUp: false,
      createdAt: currentDay,
      researchLog: [],
    }

    setItems((current) => [nextItem, ...current])
    setDraft(createDraft({ storage: draft.storage, remindDays: draft.remindDays }))
    setResearchMessage('登録しました')
  }

  function updateItem(itemId: string, updater: (item: InventoryItem) => InventoryItem) {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)))
  }

  function updateItemStorage(itemId: string, storage: StoragePlace) {
    updateItem(itemId, (item) => ({
      ...item,
      storage,
      movedAt: currentDay,
      customLocation:
        !item.customLocation || item.customLocation === storageMeta[item.storage].defaultLocation
          ? storageMeta[storage].defaultLocation
          : item.customLocation,
    }))
  }

  function updateRemaining(itemId: string, remainingPercent: number) {
    updateItem(itemId, (item) => ({ ...item, remainingPercent }))
  }

  function markUsedUp(itemId: string) {
    updateItem(itemId, (item) => ({ ...item, usedUp: true, usedUpAt: currentDay, remainingPercent: 0 }))
  }

  function restoreItem(itemId: string) {
    updateItem(itemId, (item) => ({
      ...item,
      usedUp: false,
      usedUpAt: undefined,
      purchasedAt: currentDay,
      remainingPercent: item.remainingPercent && item.remainingPercent > 0 ? item.remainingPercent : 100,
    }))
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  function fillDraftFromName(name: string) {
    const guide = findFoodGuide(name)
    setDraft(createDraft({ name, guideId: guide?.id ?? '' }))
    setResearchMessage(guide ? `${guide.name} の保存目安を適用中` : '手入力期限で登録できます')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addResearchLog(itemId: string, sourceLabel: string, url: string) {
    updateItem(itemId, (item) => ({
      ...item,
      researchLog: [
        {
          id: createId(),
          query: item.name,
          sourceLabel,
          url,
          checkedAt: `${currentDay} ${nowTime()}`,
          note: '公的ソース検索を確認',
        },
        ...(item.researchLog ?? []),
      ].slice(0, 5),
    }))
    setNotice('確認ログを保存しました')
  }

  async function showNotification(title: string, body: string, automatic = false) {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      setNotice(body)
      return false
    }

    if (Notification.permission === 'default') {
      if (automatic) return false
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }

    if (Notification.permission !== 'granted') {
      setNotificationPermission(Notification.permission)
      setNotice(body)
      return false
    }

    setNotificationPermission(Notification.permission)
    const registration = await navigator.serviceWorker?.ready.catch(() => undefined)
    if (registration) {
      await registration.showNotification(title, { body, tag: 'kitchen-stock-reminder' })
    } else {
      new Notification(title, { body })
    }
    return true
  }

  async function sendReminder(automatic = false) {
    const reminderTargets = alertInsights
      .filter((insight) => insight.status !== 'unknown')
      .slice(0, 6)
      .map((insight) => `${insight.item.name} ${formatDaysLeft(insight.daysLeft)}`)

    if (reminderTargets.length === 0) {
      if (!automatic) setNotice('今日のリマインド対象はありません')
      setReminderSettings((current) => ({ ...current, lastSentDate: currentDay }))
      return
    }

    const message = reminderTargets.join(' / ')
    const sent = await showNotification('食材期限リマインド', message, automatic)
    if (!automatic && reminderSettings.serverPush) {
      void callAppApi('/api/send-reminders', {
        deviceId: cloudSyncCredentials.deviceId,
        force: true,
        secret: cloudSyncCredentials.secret,
      }).catch(() => undefined)
    }
    setReminderSettings((current) => ({ ...current, lastSentDate: currentDay }))
    setNotice(sent ? '通知を送信しました' : message)
  }

  async function updateReminderEnabled(enabled: boolean) {
    if (!enabled) {
      setReminderSettings((current) => ({ ...current, enabled: false }))
      return
    }

    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    } else {
      setNotificationPermission(getNotificationPermissionState())
    }

    setReminderSettings((current) => ({ ...current, enabled: true, browser: true }))
    setNotice('アプリ起動中と次回起動時に期限を確認します')
    void registerServerPush()
  }

  useEffect(() => {
    if (!reminderSettings.enabled) return
    if (!reminderSettings.browser) return

    function runDailyCheck() {
      if (reminderSettings.lastSentDate === currentDay) return
      if (currentMinutes() < minutes(reminderSettings.dailyTime)) return
      void sendReminder(true)
    }

    runDailyCheck()
    const timerId = window.setInterval(runDailyCheck, 60_000)
    window.addEventListener('focus', runDailyCheck)
    document.addEventListener('visibilitychange', runDailyCheck)
    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', runDailyCheck)
      document.removeEventListener('visibilitychange', runDailyCheck)
    }
  })

  function startVoiceInput() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      setVoiceState('非対応')
      setNotice('このブラウザは音声入力に対応していません')
      return
    }

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setVoiceState('聞き取り中')
    recognition.onerror = () => setVoiceState('再試行')
    recognition.onend = () => setVoiceState('音声入力')
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim()
      if (!transcript) return
      const guide = findFoodGuide(transcript)
      setDraft((current) => ({ ...current, name: transcript, guideId: guide?.id ?? current.guideId }))
      setResearchMessage(guide ? `${guide.name} の保存目安を適用中` : '音声から食材名を入力しました')
    }
    recognition.start()
  }

  async function scanBarcode(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!('BarcodeDetector' in window)) {
      setNotice('このブラウザは画像からのバーコード読取に対応していません')
      return
    }

    try {
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] })
      const bitmap = await createImageBitmap(file)
      const results = await detector.detect(bitmap)
      const barcode = results[0]?.rawValue
      if (!barcode) {
        setNotice('バーコードを検出できませんでした')
        return
      }
      setDraft((current) => ({ ...current, barcode, name: current.name || `バーコード ${barcode}` }))
      setNotice(`バーコード ${barcode} を読み取りました`)
      try {
        const product = await callAppApi<{
          expirationDate?: string
          found: boolean
          productName?: string
          sourceUrl?: string
        }>('/api/product-lookup', { barcode })
        if (product.found) {
          const parsedDate = product.expirationDate ? extractExpiryDate(product.expirationDate) : ''
          setDraft((current) => ({
            ...current,
            barcode,
            name: current.name.startsWith('バーコード') || !current.name ? product.productName || current.name : current.name,
            packageExpiry: current.packageExpiry || parsedDate,
          }))
          setNotice(product.productName ? `${product.productName}を商品DBから補完しました` : '商品DBを確認しました')
        }
      } catch {
        setNotice(`バーコード ${barcode} を読み取りました。商品DB照合は後で再試行できます`)
      }
    } catch {
      setNotice('バーコード読取に失敗しました')
    }
  }

  async function scanExpiryImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setOcrState('読取中')
    setNotice('期限の写真を読み取っています')
    try {
      const { recognize } = await import('tesseract.js')
      const result = await recognize(file, 'jpn+eng')
      const text = result.data.text
      const expiryDate = extractExpiryDate(text)
      const expiryType = guessExpiryTypeFromText(text)
      if (!expiryDate) {
        setNotice('期限日を読み取れませんでした。包装の日付を手入力してください')
        return
      }
      setDraft((current) => ({
        ...current,
        expiryType: expiryType === 'unknown' ? current.expiryType : expiryType,
        packageExpiry: expiryDate,
      }))
      setNotice(`期限 ${formatDate(expiryDate)} を読み取りました`)
    } catch {
      setNotice('期限OCRに失敗しました。写真を明るく撮り直すか手入力してください')
    } finally {
      setOcrState('期限OCR')
    }
  }

  function addManualShoppingItem() {
    const name = manualShoppingName.trim()
    if (!name) return
    setShoppingItems((current) => [createShoppingItem(name, 'manual'), ...current])
    setManualShoppingName('')
  }

  function toggleShoppingItem(name: string) {
    setShoppingItems((current) => {
      const existing = current.find((item) => item.name === name)
      if (existing) {
        return current.map((item) => (item.name === name ? { ...item, checked: !item.checked } : item))
      }
      return [{ ...createShoppingItem(name, 'manual'), checked: true }, ...current]
    })
  }

  function removeShoppingItem(name: string) {
    setShoppingItems((current) => {
      const existing = current.find((item) => item.name === name)
      if (existing) return current.filter((item) => item.name !== name)
      return [{ ...createShoppingItem(name, 'manual'), checked: true }, ...current]
    })
  }

  function exportBackup() {
    const payload: BackupPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      items,
      shoppingItems,
      reminderSettings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kitchen-stock-${currentDay}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('バックアップJSONを書き出しました')
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const payload = JSON.parse(await file.text()) as Partial<BackupPayload>
      if (Array.isArray(payload.items)) setItems(payload.items.filter(isInventoryItem))
      if (Array.isArray(payload.shoppingItems)) setShoppingItems(payload.shoppingItems.filter(isShoppingItem))
      if (payload.reminderSettings) {
        setReminderSettings({ ...createDefaultReminderSettings(), ...payload.reminderSettings })
      }
      setNotice('バックアップを読み込みました')
    } catch {
      setNotice('バックアップJSONを読み込めませんでした')
    }
  }

  async function copyShareText() {
    const text = buildShareText(insights, visibleShoppingItems)
    await navigator.clipboard?.writeText(text)
    setNotice('在庫と買い物リストをコピーしました')
  }

  function showPushActionStatus(message: string) {
    setNotice(message)
    setPushActionStatus(message)
  }

  async function syncCloudStateNow() {
    if (!supabaseClient) throw new Error('クラウド同期が未設定です')
    if (cloudSyncPaused) throw new Error('クラウド同期が停止中です')

    setCloudSyncStatus('クラウド同期 保存中')
    const payload = createCloudSyncPayload(
      items,
      shoppingItems,
      reminderSettings,
      createReminderSnapshotTargets(items, currentDay),
    )
    const { error } = await supabaseClient.rpc('upsert_kitchen_stock_state', {
      p_device_id: cloudSyncCredentials.deviceId,
      p_payload: payload,
      p_secret: cloudSyncCredentials.secret,
    })

    if (error) throw new Error(error.message)
    setCloudSyncReady(true)
    setCloudSyncStatus(`クラウド同期済み ${nowTime()}`)
  }

  async function createLineLinkCodeAction() {
    if (lineLinkBusy) return
    if (localDevApiMissing) {
      setLineLinkStatus('ローカルのAPI向き先が未設定です')
      return
    }
    if (!supabaseClient) {
      setLineLinkStatus('LINE連携にはクラウド同期設定が必要です')
      return
    }
    if (cloudSyncPaused) {
      setLineLinkStatus('クラウド同期を再開してからLINE連携してください')
      return
    }

    try {
      setLineLinkBusy('create')
      setLineLinkStatus('連携コードを発行しています')
      await syncCloudStateNow()
      const result = await callAppApi<LineLinkCode & { ok: boolean }>('/api/create-line-link-code', {
        deviceId: cloudSyncCredentials.deviceId,
        secret: cloudSyncCredentials.secret,
      })
      setLineLinkCode(result)
      setLineLinkStatus('このコードをLINE公式アカウントに送信してください。送信後は自動で確認します')
    } catch (error) {
      setLineLinkStatus(`連携コードの発行に失敗: ${getPushFailureMessage(error)}`)
    } finally {
      setLineLinkBusy(null)
    }
  }

  async function copyLineLinkCode() {
    if (!lineLinkCode) return
    try {
      await navigator.clipboard?.writeText(lineLinkCode.code)
      setLineLinkStatus('連携コードをコピーしました。LINE公式アカウントに貼り付けて送信してください')
    } catch {
      setLineLinkStatus('コードを選択してコピーしてください')
    }
  }

  async function registerServerPush() {
    if (pushActionBusy) return
    if (!vapidPublicKey) {
      showPushActionStatus('サーバーPushの公開鍵が未設定です')
      return
    }
    if (localDevApiMissing) {
      showPushActionStatus('ローカルのAPI向き先が未設定です')
      return
    }
    if (!supabaseClient) {
      showPushActionStatus('サーバーPushにはクラウド同期設定が必要です')
      return
    }
    if (cloudSyncPaused) {
      showPushActionStatus('サーバーPushにはクラウド同期の再開が必要です')
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showPushActionStatus('このブラウザはサーバーPushに対応していません')
      return
    }
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      showPushActionStatus('このブラウザは通知に対応していません')
      return
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      showPushActionStatus('通知がブロック中です。ブラウザのサイト設定で通知を許可してから再度押してください')
      return
    }

    if (Notification.permission === 'default') {
      showPushActionStatus('ブラウザの通知許可を待っています')
    }
    const permission =
      Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    setNotificationPermission(permission)
    if (permission !== 'granted') {
      showPushActionStatus('通知が許可されていません')
      return
    }

    try {
      setPushActionBusy('register')
      showPushActionStatus('Push登録の準備中です')
      await syncCloudStateNow()
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          userVisibleOnly: true,
        }))

      const result = await callAppApi<{
        emailConfigured: boolean
        lineConfigured: boolean
        lineLinked: boolean
        pushEnabled: boolean
        webhookEnabled: boolean
      }>('/api/register-push-subscription', {
        dailyTime: reminderSettings.dailyTime,
        deviceId: cloudSyncCredentials.deviceId,
        emailAddress: reminderSettings.emailAddress,
        lineMemo: '',
        secret: cloudSyncCredentials.secret,
        subscription: subscription.toJSON(),
        timezone: reminderSettings.timezone,
        webhookUrl: reminderSettings.webhookUrl.startsWith('https://') ? reminderSettings.webhookUrl : '',
      })

      setReminderSettings((current) => ({ ...current, browser: true, enabled: true, serverPush: result.pushEnabled }))
      if (result.lineLinked) setLineLinked(true)
      const extraTargets = [
        result.lineLinked ? 'LINE通知も保存' : '',
        result.webhookEnabled ? 'Webhookも保存' : '',
      ].filter(Boolean)
      showPushActionStatus(
        result.pushEnabled
          ? `閉じていても届くPushを登録しました${extraTargets.length > 0 ? ` (${extraTargets.join(' / ')})` : ''}`
          : '通知設定を保存しました。ブラウザPushは未登録です',
      )
    } catch (error) {
      showPushActionStatus(`サーバーPush登録に失敗: ${getPushFailureMessage(error)}`)
    } finally {
      setPushActionBusy(null)
    }
  }

  async function sendServerReminderNow() {
    if (pushActionBusy) return
    try {
      if (!reminderSettings.serverPush) {
        showPushActionStatus('先にPush登録を完了してください')
        return
      }
      setPushActionBusy('server')
      showPushActionStatus('サーバー通知を確認中です')
      const result = await callAppApi<{ checked: number; sent: number; skipped: number; webPushReady: boolean }>(
        '/api/send-reminders',
        {
          deviceId: cloudSyncCredentials.deviceId,
          force: true,
          secret: cloudSyncCredentials.secret,
        },
      )
      if (!result.webPushReady) {
        showPushActionStatus('サーバーPush鍵が未設定です')
      } else if (result.checked === 0) {
        showPushActionStatus('登録済みのPush購読が見つかりません。先にPush登録を押してください')
      } else if (result.sent === 0) {
        showPushActionStatus(`サーバー確認OK。通知対象はありません (${result.skipped}件確認)`)
      } else {
        showPushActionStatus(`サーバー通知を送信しました (${result.sent}件)`)
      }
    } catch (error) {
      showPushActionStatus(`サーバー通知の送信に失敗: ${getPushFailureMessage(error)}`)
    } finally {
      setPushActionBusy(null)
    }
  }

  async function deleteCloudState() {
    try {
      const result = await callAppApi<{ deletedProfiles: number; deletedSubscriptions: number }>('/api/delete-cloud-state', {
        deviceId: cloudSyncCredentials.deviceId,
        secret: cloudSyncCredentials.secret,
      })
      window.localStorage.setItem(cloudSyncPausedStorageKey, 'true')
      setCloudSyncPaused(true)
      setCloudSyncStatus('クラウド削除済み / ローカル保存中')
      setNotice(`クラウド保存を削除しました (${result.deletedProfiles}件)`)
    } catch {
      setNotice('クラウド保存を削除できませんでした')
    }
  }

  function resumeCloudSync() {
    window.localStorage.removeItem(cloudSyncPausedStorageKey)
    setCloudSyncPaused(false)
    setCloudSyncReady(false)
    setCloudSyncStatus('クラウド同期 準備中')
  }

  async function sendLoginLink() {
    if (!supabaseClient) {
      setAccountStatus('Supabase未設定')
      return
    }
    const email = accountEmail.trim()
    if (!email) {
      setAccountStatus('メールを入力してください')
      return
    }
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    setAccountStatus(error ? 'ログインリンクを送れませんでした' : 'ログインリンクを送信しました')
  }

  async function claimAccountSync() {
    if (!supabaseClient || !sessionEmail) {
      setAccountStatus('ログイン後に同期できます')
      return
    }
    const { error } = await supabaseClient.rpc('claim_kitchen_stock_state', {
      p_device_id: cloudSyncCredentials.deviceId,
      p_email: sessionEmail,
      p_secret: cloudSyncCredentials.secret,
    })
    setAccountStatus(error ? 'アカウント紐付けに失敗しました' : 'この在庫をアカウントに紐付けました')
  }

  async function loadAccountSync() {
    if (!supabaseClient || !sessionEmail) {
      setAccountStatus('ログイン後に復元できます')
      return
    }
    const { data, error } = await supabaseClient.rpc('get_account_kitchen_stock_state')
    if (error || !isCloudSyncPayload(data)) {
      setAccountStatus('アカウント保存を読み込めませんでした')
      return
    }
    if (Array.isArray(data.items)) setItems(data.items.filter(isInventoryItem))
    if (Array.isArray(data.shoppingItems)) setShoppingItems(data.shoppingItems.filter(isShoppingItem))
    if (data.reminderSettings) setReminderSettings({ ...createDefaultReminderSettings(), ...data.reminderSettings })
    setAccountStatus('アカウント保存を読み込みました')
  }

  async function signOutAccount() {
    if (!supabaseClient) return
    await supabaseClient.auth.signOut()
    setSessionEmail('')
    setAccountStatus('ログアウトしました')
  }

  return (
    <main className={`app-shell view-${activeView}`}>
      <a className="skip-link" href="#today-check">
        本文へ移動
      </a>
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <svg className="brand-bowl-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path className="brand-bowl-rice" d="M13.8 22.5c1.4-6.5 5.8-10.5 10.3-10.5 4.6 0 8.8 4 10.1 10.5" />
              <path className="brand-bowl-body" d="M10.4 22.5h27.2c-.7 8.1-5.6 13.1-13.6 13.1s-12.9-5-13.6-13.1Z" />
              <path className="brand-bowl-rim" d="M9 22.5h30" />
              <path className="brand-bowl-foot" d="M18.2 37h11.6" />
              <path className="brand-rice-grain" d="M18.3 17.7c1.2-1.6 2.7-1.8 4-.5" />
              <path className="brand-rice-grain" d="M24.8 15.7c1.8-.8 3.2-.3 4.1 1.4" />
              <path className="brand-rice-grain" d="M15.9 20.4c1.5-.9 2.9-.7 4.1.5" />
            </svg>
          </div>
          <div className="brand-copy">
            <p>自炊食材の期限管理</p>
            <h1>食材期限帳</h1>
            <span className="brand-subtitle">何を使う・何を買う・いつ通知するか</span>
            <span className="cloud-sync-pill">
              <Cloud size={13} />
              {cloudSyncStatus}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            aria-label="使い方ツアーを開く"
            className="ghost-button"
            title="使い方"
            type="button"
            onClick={openTour}
          >
            <CircleHelp size={18} />
          </button>
          <button
            aria-label="期限通知を送信"
            className="ghost-button"
            title="期限通知"
            type="button"
            onClick={() => void sendReminder(false)}
          >
            <Bell size={18} />
          </button>
        </div>
      </header>

      <section className="daily-focus" aria-label="食材期限の今日の確認">
        <div className="focus-summary">
          <div className="focus-copy">
            <span className="focus-kicker">{focusKicker}</span>
            <p>今日の判断</p>
            <h2>{focusTitle}</h2>
            <span>{focusSubtext}</span>
            <div className="daily-routine" aria-label="最初に見る順番">
              <button
                className={notificationSetupNeeded ? 'routine-step needs-action' : 'routine-step is-done'}
                type="button"
                onClick={openNotificationSetup}
              >
                <span>通知</span>
                <strong>{notificationReadinessLabel}</strong>
                <small>LINE・Push・時刻</small>
              </button>
              <button
                className={alertInsights.length > 0 ? 'routine-step needs-action' : 'routine-step'}
                type="button"
                onClick={() => switchView('today')}
              >
                <span>今日</span>
                <strong>{alertInsights.length > 0 ? `${alertInsights.length}件` : 'なし'}</strong>
                <small>{firstAttention ? firstAttention.item.name : '期限は落ち着いています'}</small>
              </button>
              <button
                className={shoppingTodoCount > 0 ? 'routine-step needs-action' : 'routine-step'}
                type="button"
                onClick={() => switchView('shopping')}
              >
                <span>買う</span>
                <strong>{shoppingTodoCount > 0 ? `${shoppingTodoCount}件` : 'OK'}</strong>
                <small>不足・使い切り</small>
              </button>
            </div>
          </div>
          <div className={`focus-orbit ${firstAttention ? `is-${firstAttention.status}` : 'is-ok'}`}>
            <span>{notificationSetupNeeded ? '準備状況' : '期限チェック'}</span>
            <strong>
              {notificationSetupNeeded
                ? notificationReadinessLabel
                : firstAttention
                  ? formatDaysLeft(firstAttention.daysLeft)
                  : '準備OK'}
            </strong>
            <small>
              {notificationSetupNeeded
                ? '通知を整えると毎日の確認が軽くなります'
                : firstAttention
                  ? firstAttention.item.name
                  : `${totalActive}件の在庫を管理中`}
            </small>
            <div className="orbit-stack" aria-label="期限の近い食材">
              {radarInsights.length === 0 ? (
                <em>在庫なし</em>
              ) : (
                radarInsights.map((insight) => (
                  <button
                    className={`orbit-chip ${statusCopy[insight.status].className}`}
                    key={insight.item.id}
                    type="button"
                    onClick={() => {
                      setSearchTerm(insight.item.name)
                      switchView('inventory')
                    }}
                  >
                    <span>{insight.item.name}</span>
                    <strong>{formatDaysLeft(insight.daysLeft)}</strong>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="focus-cta-group">
            <button
              className="focus-primary-action"
              type="button"
              onClick={notificationSetupNeeded ? openNotificationSetup : () => switchView(nextActionView)}
            >
              {primaryActionLabel}
            </button>
            <button className="focus-secondary-action" type="button" onClick={() => switchView(secondaryActionView)}>
              {secondaryActionLabel}
            </button>
          </div>
        </div>
        <nav className="focus-actions" aria-label="主な操作">
          <button
            aria-current={activeView === 'today' ? 'page' : undefined}
            className={activeView === 'today' ? 'is-current' : ''}
            type="button"
            onClick={() => switchView('today')}
          >
            <AlertTriangle size={18} />
            <span>確認</span>
            <strong>{alertInsights.length}</strong>
          </button>
          <button
            aria-current={activeView === 'shopping' ? 'page' : undefined}
            className={activeView === 'shopping' ? 'is-current' : ''}
            type="button"
            onClick={() => switchView('shopping')}
          >
            <ShoppingBasket size={18} />
            <span>買い物</span>
            <strong>{shoppingTodoCount}</strong>
          </button>
          <button
            aria-current={activeView === 'add' ? 'page' : undefined}
            className={activeView === 'add' ? 'is-current' : ''}
            type="button"
            onClick={() => switchView('add')}
          >
            <PackagePlus size={18} />
            <span>登録</span>
            <strong>＋</strong>
          </button>
          <button
            aria-current={activeView === 'inventory' ? 'page' : undefined}
            className={activeView === 'inventory' ? 'is-current' : ''}
            type="button"
            onClick={() => switchView('inventory')}
          >
            <ClipboardList size={18} />
            <span>在庫</span>
            <strong>{totalActive}</strong>
          </button>
        </nav>
      </section>

      {notice ? (
        <p className="global-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <section className="top-grid">
        <form className="entry-panel compact-entry" id="add-food" onSubmit={handleAddItem}>
            <div className="section-heading">
              <PackagePlus size={20} />
              <div>
                <p>しまう</p>
                <h2>買った食材を追加</h2>
              </div>
            </div>

          <label className="field">
            <span>食材名</span>
            <div className="input-with-action">
              <input
                autoComplete="off"
                list="food-guide-options"
                name="food-name"
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value
                  const guide = findFoodGuide(name)
                  setDraft((current) => ({ ...current, name, guideId: guide?.id ?? current.guideId }))
                }}
                placeholder="例: 鶏もも肉"
              />
              <button disabled={researchBusy} type="button" onClick={() => void handleResearch()}>
                <Search size={17} />
                {researchBusy ? '確認中' : '調べる'}
              </button>
            </div>
          </label>

          <datalist id="food-guide-options">
            {foodGuides.map((guide) => (
              <option key={guide.id} value={guide.name} />
            ))}
          </datalist>

          <div className="form-row">
            <label className="field">
              <span>数量</span>
              <input
                autoComplete="off"
                name="quantity"
                value={draft.quantity}
                onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
                placeholder="1パック"
              />
            </label>
            <label className="field">
              <span>購入日</span>
              <input
                autoComplete="off"
                name="purchased-at"
                type="date"
                value={draft.purchasedAt}
                onChange={(event) => setDraft((current) => ({ ...current, purchasedAt: event.target.value }))}
              />
            </label>
          </div>

          <fieldset className="storage-picker compact-storage">
            <legend>保存場所</legend>
            {(Object.entries(storageMeta) as Array<[StoragePlace, (typeof storageMeta)[StoragePlace]]>).map(
              ([storage, meta]) => {
                const Icon = meta.icon
                return (
                  <button
                    className={draft.storage === storage ? 'is-selected' : ''}
                    key={storage}
                    type="button"
                    onClick={() =>
                      setDraft((current) => {
                        const shouldUseDefaultLocation =
                          !current.customLocation ||
                          current.customLocation === storageMeta[current.storage].defaultLocation

                        return {
                          ...current,
                          storage,
                          movedAt: current.movedAt || currentDay,
                          customLocation: shouldUseDefaultLocation ? meta.defaultLocation : current.customLocation,
                        }
                      })
                    }
                  >
                    <Icon size={18} />
                    {meta.label}
                  </button>
                )
              },
            )}
          </fieldset>

          <div className="form-row">
            <label className="field">
              <span>包装の期限</span>
              <input
                autoComplete="off"
                name="package-expiry"
                type="date"
                value={draft.packageExpiry}
                onChange={(event) => setDraft((current) => ({ ...current, packageExpiry: event.target.value }))}
              />
            </label>
            <div className="deadline-preview">
              <CalendarClock size={18} />
              <div>
                <span>期限見込み</span>
                <strong>{draftDeadline ? formatDate(draftDeadline) : '未設定'}</strong>
                <small>
                  {draftDeadlineDetail
                    ? getDeadlineReasonDetail(draftDeadlineDetail.reason, draftSourceSummary)
                    : '包装期限または保存目安から計算'}
                </small>
              </div>
            </div>
          </div>

          <details className="advanced-details">
            <summary>詳細入力</summary>
            <div className="advanced-body">
              <div className="quick-capture">
                <button type="button" onClick={startVoiceInput}>
                  <Mic size={17} />
                  {voiceState}
                </button>
                <label>
                  <Camera size={17} />
                  バーコード
                  <input
                    accept="image/*"
                    capture="environment"
                    type="file"
                    onChange={(event) => void scanBarcode(event)}
                  />
                </label>
                <label>
                  <FileText size={17} />
                  {ocrState}
                  <input
                    accept="image/*"
                    capture="environment"
                    type="file"
                    onChange={(event) => void scanExpiryImage(event)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>期限種別</span>
                  <select
                    value={draft.expiryType}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, expiryType: event.target.value as ExpiryType }))
                    }
                  >
                    <option value="unknown">期限種別なし</option>
                    <option value="useBy">消費期限</option>
                    <option value="bestBefore">賞味期限</option>
                  </select>
                </label>
                <label className="field">
                  <span>何日前に注意</span>
                  <input
                    autoComplete="off"
                    name="remind-days"
                    min="0"
                    type="number"
                    value={draft.remindDays}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, remindDays: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>開封日</span>
                  <input
                    autoComplete="off"
                    name="opened-at"
                    type="date"
                    value={draft.openedAt}
                    onChange={(event) => setDraft((current) => ({ ...current, openedAt: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>移動日</span>
                  <input
                    autoComplete="off"
                    name="moved-at"
                    type="date"
                    value={draft.movedAt}
                    onChange={(event) => setDraft((current) => ({ ...current, movedAt: event.target.value }))}
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>棚・場所</span>
                  <input
                    autoComplete="off"
                    name="custom-location"
                    value={draft.customLocation}
                    onChange={(event) => setDraft((current) => ({ ...current, customLocation: event.target.value }))}
                    placeholder={storageMeta[draft.storage].defaultLocation}
                  />
                </label>
                <label className="field">
                  <span>バーコード</span>
                  <input
                    autoComplete="off"
                    name="barcode"
                    value={draft.barcode}
                    onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))}
                    placeholder="JAN/EAN"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>ロット</span>
                  <input
                    autoComplete="off"
                    name="lot-code"
                    value={draft.lotCode}
                    onChange={(event) => setDraft((current) => ({ ...current, lotCode: event.target.value }))}
                    placeholder="任意"
                  />
                </label>
                <label className="field">
                  <span>残量 {draft.remainingPercent}%</span>
                  <input
                    name="remaining-percent"
                    max="100"
                    min="0"
                    step="25"
                    type="range"
                    value={draft.remainingPercent}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, remainingPercent: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>

              <label className="field">
                <span>メモ</span>
                <input
                  autoComplete="off"
                  name="note"
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="例: 下味冷凍、半分使用済み"
                />
              </label>

              <div className="research-actions">
                {draftSourceLinks.map((target) => (
                  <a href={target.url} key={target.label} rel="noreferrer" target="_blank">
                    <Link size={15} />
                    {target.label}
                  </a>
                ))}
              </div>
            </div>
          </details>

          <div className="research-strip" aria-label="期限リサーチ">
            <div>
              <Database size={17} />
              <span>{selectedGuide ? `${selectedGuide.name} の調査済み保存目安` : researchMessage}</span>
            </div>
            <div>
              {(Object.keys(storageMeta) as StoragePlace[]).map((storage) => {
                const duration = selectedGuide?.storage[storage]
                return (
                  <span className="research-pill" key={storage}>
                    {storageMeta[storage].label}: {duration?.label ?? 'なし'}
                  </span>
                )
              })}
            </div>
            <div className="research-source">
              <span>{draftSourceSummary.label}</span>
              <small>
                {draftSourceSummary.checked ? `${draftSourceSummary.checked} 確認` : '食材名を入れると参照元を表示'}
              </small>
            </div>
            {liveResearch ? (
              <div className="live-research-result">
                <strong>
                  実リサーチ {liveResearch.confidence === 'medium' ? '関連あり' : '要確認'}
                </strong>
                <span>{liveResearch.summary}</span>
                <div>
                  {liveResearch.sources.slice(0, 3).map((source) => (
                    <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                      {source.publisher}
                      <small>{source.ok ? `${source.status}` : source.error ?? 'error'}</small>
                    </a>
                  ))}
                </div>
                {liveResearch.productCandidates.length > 0 ? (
                  <small>
                    商品候補: {liveResearch.productCandidates.map((candidate) => candidate.name).filter(Boolean).join('、')}
                  </small>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Plus size={18} />
              追加
            </button>
          </div>
        </form>

        <aside className="today-panel">
          <section className="today-card" id="today-check">
            <div className="section-heading">
              <AlertTriangle size={20} />
              <div>
                <p>開いたら最初</p>
                <h2>今日使う食材</h2>
              </div>
            </div>
            <div className="alert-list">
              {deadlineLeadAlerts.length > 0 ? (
                <div className="expiry-alert" role="alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>期限2日前です</strong>
                    <span>{deadlineLeadAlerts.map((insight) => insight.item.name).join('、')}を確認してください</span>
                  </div>
                </div>
              ) : null}
              {alertInsights.length === 0 ? (
                <p className="quiet-text">期限が近い食材はありません</p>
              ) : (
                alertInsights.slice(0, 4).map((insight) => (
                  <button
                    className="alert-item"
                    key={insight.item.id}
                    type="button"
                    onClick={() => fillDraftFromName(insight.item.name)}
                  >
                    <span>{insight.item.name}</span>
                    <strong>{formatDaysLeft(insight.daysLeft)}</strong>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rail-section shopping-overview" id="shopping-list">
            <div className="section-heading">
              <ShoppingBasket size={20} />
              <div>
                <p>不足</p>
                <h2>買い足すもの</h2>
              </div>
            </div>
            <div className="shopping-input">
              <input
                autoComplete="off"
                name="shopping-item"
                value={manualShoppingName}
                onChange={(event) => setManualShoppingName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addManualShoppingItem()
                }}
                placeholder="追加"
              />
              <button type="button" onClick={addManualShoppingItem} aria-label="買うものを追加">
                <Plus size={16} />
              </button>
            </div>
            <div className="shopping-list compact-list">
              {visibleShoppingItems.length === 0 ? (
                <p className="quiet-text">定番食材はそろっています</p>
              ) : (
                visibleShoppingItems.slice(0, 6).map((item) => (
                  <div className={item.checked ? 'shopping-row is-checked' : 'shopping-row'} key={item.name}>
                    <button type="button" onClick={() => toggleShoppingItem(item.name)}>
                      <span>{item.name}</span>
                      <small>{item.source === 'manual' ? '手動' : '自動'}</small>
                    </button>
                    <button aria-label={`${item.name}を削除`} type="button" onClick={() => removeShoppingItem(item.name)}>
                      <Trash2 size={15} />
                    </button>
                    <button aria-label={`${item.name}を登録`} type="button" onClick={() => fillDraftFromName(item.name)}>
                      <Plus size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

        </aside>
      </section>

      <section className="inventory-area" id="inventory-list">
          <div className="list-toolbar">
            <div className="section-heading">
              <ClipboardList size={20} />
              <div>
                <p>冷蔵庫・冷凍庫</p>
                <h2>在庫</h2>
              </div>
            </div>
            <label className="search-box">
              <Search size={17} />
              <input
                autoComplete="off"
                name="inventory-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="食材名・保存場所・バーコードを検索"
              />
            </label>
          </div>

          <div className="filter-tabs" role="tablist" aria-label="在庫フィルター">
            {[
              ['active', '使用中'],
              ['fridge', '冷蔵'],
              ['freezer', '冷凍'],
              ['pantry', '常温'],
              ['low', '残量少'],
              ['used', '使い切り'],
            ].map(([key, label]) => (
              <button
                aria-selected={filter === key}
                className={filter === key ? 'is-selected' : ''}
                key={key}
                role="tab"
                type="button"
                onClick={() => setFilter(key as InventoryFilter)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inventory-list">
            {visibleInsights.length === 0 ? (
              <div className="empty-state">
                <PackagePlus size={24} />
                <p>表示できる在庫がありません</p>
              </div>
            ) : (
              visibleInsights.map((insight) => {
                const meta = storageMeta[insight.item.storage]
                const Icon = meta.icon
                const status = statusCopy[insight.status]
                const sourceLinks = getSourceLinks(insight.guide, insight.item.name)
                const primarySource = sourceLinks[0]
                const sourceSummary = getSourceSummary(insight.guide)
                const deadlineReasonDetail = getDeadlineReasonDetail(insight.deadlineReason, sourceSummary)
                const evidenceSummary = getEvidenceSummary(insight.deadlineReason, sourceSummary)

                return (
                  <article className="inventory-row" key={insight.item.id}>
                    <div className="item-summary-line">
                      <div className={`item-thumb ${status.className}`} aria-hidden="true">
                        <span>{insight.item.name.trim().slice(0, 1) || '食'}</span>
                        <small>{meta.label}</small>
                      </div>
                      <div className="item-main">
                        <div className="item-title-line">
                          <span className={`status-dot ${status.className}`}>{status.label}</span>
                          <h3>{insight.item.name}</h3>
                        </div>
                        <div className="item-quick-facts" aria-label={`${insight.item.name}の保存情報`}>
                          <span>{insight.item.quantity}</span>
                          <span>残量{insight.item.remainingPercent ?? 100}%</span>
                          <span>{meta.label}</span>
                        </div>
                        <div className="item-data-line">
                          <span className={evidenceSummary.className}>{evidenceSummary.label}</span>
                          <small>{evidenceSummary.detail}</small>
                        </div>
                        <div className={`item-life-strip ${status.className}`} aria-label={`期限の近さ ${formatDaysLeft(insight.daysLeft)}`}>
                          <span
                            style={
                              {
                                '--deadline-urgency': `${getDeadlineUrgencyPercent(insight.daysLeft)}%`,
                              } as CSSProperties
                            }
                          />
                        </div>
                        <div className="item-meta">
                          <span>{insight.deadlineReason}</span>
                          <span>{insight.item.customLocation ?? meta.defaultLocation}</span>
                          {insight.item.openedAt ? <span>開封 {formatDate(insight.item.openedAt)}</span> : null}
                          {insight.item.movedAt ? <span>移動 {formatDate(insight.item.movedAt)}</span> : null}
                          {insight.item.barcode ? <span>JAN {insight.item.barcode}</span> : null}
                        </div>
                        <div className="item-source-line">
                          <Database size={14} />
                          <span>{sourceSummary.label}</span>
                          {sourceSummary.checked ? <small>{sourceSummary.checked}確認</small> : null}
                        </div>
                      </div>
                      <div className="item-deadline">
                        <strong>{formatDaysLeft(insight.daysLeft)}</strong>
                        <span>{formatDate(insight.deadline)}</span>
                      </div>
                    </div>
                    <details className="item-manage">
                      <summary>保存場所・残量・操作</summary>
                      <div className="item-controls">
                        <div className="item-storage">
                          <Icon size={17} />
                          <select
                            aria-label={`${insight.item.name}の保存場所`}
                            disabled={insight.item.usedUp}
                            value={insight.item.storage}
                            onChange={(event) => updateItemStorage(insight.item.id, event.target.value as StoragePlace)}
                          >
                            {(Object.keys(storageMeta) as StoragePlace[]).map((storage) => (
                              <option key={storage} value={storage}>
                                {storageMeta[storage].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="remaining-buttons" aria-label={`${insight.item.name}の残量`}>
                          {[100, 50, 25].map((value) => (
                            <button
                              className={(insight.item.remainingPercent ?? 100) === value ? 'is-selected' : ''}
                              disabled={insight.item.usedUp}
                              key={value}
                              type="button"
                              onClick={() => updateRemaining(insight.item.id, value)}
                            >
                              {value}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="item-source-card">
                        <strong>参照元</strong>
                        <span>{deadlineReasonDetail}</span>
                        <small>{sourceSummary.note}</small>
                        <div>
                          {sourceLinks.slice(0, 3).map((source) => (
                            <a href={source.url} key={`${insight.item.id}-${source.label}`} rel="noreferrer" target="_blank">
                              {source.publisher}
                              <ExternalLink size={13} />
                            </a>
                          ))}
                        </div>
                      </div>
                      <div className="item-actions">
                        <a href={primarySource.url} rel="noreferrer" target="_blank">
                          <Search size={17} />
                          参照元
                        </a>
                        <button
                          type="button"
                          onClick={() => addResearchLog(insight.item.id, primarySource.label, primarySource.url)}
                        >
                          <Save size={17} />
                          ログ
                        </button>
                        {insight.item.usedUp ? (
                          <button type="button" onClick={() => restoreItem(insight.item.id)}>
                            <RotateCcw size={17} />
                            戻す
                          </button>
                        ) : (
                          <button type="button" onClick={() => markUsedUp(insight.item.id)}>
                            <CheckCircle2 size={17} />
                            使い切り
                          </button>
                        )}
                        <button
                          aria-label={`${insight.item.name}を削除`}
                          className="icon-button"
                          type="button"
                          onClick={() => removeItem(insight.item.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      {insight.item.note || (insight.item.researchLog?.length ?? 0) > 0 ? (
                        <div className="item-note">
                          {insight.item.note ? <p>{insight.item.note}</p> : null}
                          {insight.item.researchLog?.[0] ? (
                            <small>
                              最終確認: {insight.item.researchLog[0].sourceLabel} / {insight.item.researchLog[0].checkedAt}
                            </small>
                          ) : null}
                        </div>
                      ) : null}
                    </details>
                  </article>
                )
              })
            )}
          </div>
      </section>

      <details className="support-drawer">
        <summary>通知・バックアップ・参照元</summary>
        <section className="utility-grid">
          <section className="rail-section">
          <div className="section-heading">
            <ChefHat size={20} />
            <div>
              <p>使い切り</p>
              <h2>使い切り案</h2>
            </div>
          </div>
          <div className="recipe-list">
            {recipeIdeas.slice(0, 3).map((idea) => (
              <div className="recipe-card" key={idea.title}>
                <strong>{idea.title}</strong>
                <span>{idea.ingredients.join('、')}</span>
                <p>{idea.note}</p>
              </div>
            ))}
          </div>
          </section>

          <section className="rail-section" id="notification-settings">
          <div className="section-heading">
            <Bell size={20} />
            <div>
              <p>通知</p>
              <h2>通知の受け取り</h2>
            </div>
          </div>
          <label className="toggle-row">
            <input
              checked={reminderSettings.enabled}
              name="reminder-enabled"
              type="checkbox"
              onChange={(event) => void updateReminderEnabled(event.target.checked)}
            />
            <span>毎日チェック</span>
          </label>
          <div className="reminder-status" aria-busy={pushActionBusy ? 'true' : undefined} aria-label="期限通知の状態">
            <div>
              <span>確認タイミング</span>
              <strong>{reminderSettings.enabled ? `毎日 ${reminderSettings.dailyTime} 以降` : '停止中'}</strong>
            </div>
            <div>
              <span>対象</span>
              <strong>{reminderTargetCount}件</strong>
            </div>
            <div>
              <span>通知状態</span>
              <strong>{getNotificationPermissionLabel(notificationPermission)}</strong>
            </div>
            <div>
              <span>サーバーPush</span>
              <strong>{reminderSettings.serverPush ? '登録済み' : '未登録'}</strong>
            </div>
            <div>
              <span>登録前提</span>
              <strong>{pushSetupLabel}</strong>
            </div>
            <p>{pushSetupText}</p>
            <p className={pushActionStatus ? 'push-action-status' : 'push-action-status is-empty'} role="status" aria-live="polite">
              {pushActionStatus || 'Push登録とサーバー確認の結果をここに表示します'}
            </p>
            {notificationBlocked ? (
              <div className="push-unblock-guide" role="note" aria-label="通知ブロックの解除手順">
                <strong>通知ブロックの解除</strong>
                <ol>
                  <li>アドレスバー左のサイト設定を開く</li>
                  <li>通知を「許可」に変更</li>
                  <li>ページを再読み込みしてPush登録</li>
                </ol>
                <small>ブラウザ権限はアプリから変更できません。</small>
              </div>
            ) : null}
            {!reminderSettings.serverPush ? (
              <p className="push-action-hint">サーバー確認はPush登録が完了すると使えます。</p>
            ) : null}
            <button type="button" onClick={() => void sendReminder(false)}>
              <Bell size={16} />
              今すぐ確認
            </button>
            <button disabled={pushActionBusy !== null} type="button" onClick={() => void registerServerPush()}>
              <Cloud size={16} />
              {pushActionBusy === 'register' ? '登録中' : 'Push登録'}
            </button>
            <button disabled={pushActionBusy !== null} type="button" onClick={() => void sendServerReminderNow()}>
              <ExternalLink size={16} />
              {pushActionBusy === 'server' ? '確認中' : 'サーバー確認'}
            </button>
          </div>
          <div className="form-row utility-form">
            <label className="field compact-field">
              <span>通知時刻</span>
              <input
                autoComplete="off"
                name="daily-reminder-time"
                type="time"
                value={reminderSettings.dailyTime}
                onChange={(event) =>
                  setReminderSettings((current) => ({ ...current, dailyTime: event.target.value }))
                }
              />
            </label>
            <label className="field compact-field">
              <span>メール</span>
              <input
                autoComplete="off"
                name="external-reminder-note"
                value={reminderSettings.emailAddress}
                onChange={(event) =>
                  setReminderSettings((current) => ({
                    ...current,
                    emailAddress: event.target.value,
                  }))
                }
                placeholder="name@example.com"
              />
            </label>
          </div>
          <div className="line-link-panel" aria-label="LINE通知の連携">
            <div className="line-link-heading">
              <MessageCircle aria-hidden="true" size={17} />
              <div>
                <span>LINE通知</span>
                <strong>{lineLinkLabel}</strong>
              </div>
            </div>
            <p>コードをLINE公式アカウントに送ると、通知先を自動で保存します。</p>
            {lineLinkCode ? (
              <div className="line-link-code">
                <code>{lineLinkCode.code}</code>
                <small>有効期限 {formatDateTime(lineLinkCode.expiresAt)}</small>
              </div>
            ) : null}
            <p className={lineLinkStatus ? 'line-link-status' : 'line-link-status is-empty'} role="status" aria-live="polite">
              {lineLinkStatus || 'LINE通知を使う場合は、まず連携コードを作ります'}
            </p>
            <div className="line-link-actions">
              <button disabled={lineLinkBusy !== null} type="button" onClick={() => void createLineLinkCodeAction()}>
                <MessageCircle aria-hidden="true" size={15} />
                {lineLinkBusy === 'create' ? '発行中' : 'コード発行'}
              </button>
              <button disabled={!lineLinkCode} type="button" onClick={() => void copyLineLinkCode()}>
                <Copy aria-hidden="true" size={15} />
                コピー
              </button>
              {activeLineOfficialAccountUrl ? (
                <a href={activeLineOfficialAccountUrl} rel="noreferrer" target="_blank">
                  <ExternalLink aria-hidden="true" size={15} />
                  LINEを開く
                </a>
              ) : (
                <span className="line-link-missing">LINE公式URL未設定</span>
              )}
              <button disabled={lineLinkBusy !== null} type="button" onClick={() => void refreshLineLinkStatus()}>
                <RotateCcw aria-hidden="true" size={15} />
                {lineLinkBusy === 'check' ? '確認中' : '連携確認'}
              </button>
            </div>
            <details className="line-fallback-panel">
              <summary>Webhook URLを直接使う</summary>
              <label className="field compact-field">
                <span>Webhook URL</span>
                <input
                  autoComplete="off"
                  inputMode="url"
                  name="line-webhook-note"
                  spellCheck={false}
                  type="url"
                  value={reminderSettings.webhookUrl}
                  onChange={(event) =>
                    setReminderSettings((current) => ({
                      ...current,
                      lineMemo: '',
                      webhookUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/webhook"
                />
              </label>
            </details>
          </div>
          </section>

          <section className="rail-section pwa-guide" id="pwa-guide">
          <div className="section-heading">
            <Share2 size={20} />
            <div>
              <p>PWA</p>
              <h2>ホーム画面に追加</h2>
            </div>
          </div>
          <div className="pwa-guide-list">
            <p>
              <strong>iPhone</strong>
              <span>Safariの共有から「ホーム画面に追加」</span>
            </p>
            <p>
              <strong>Android</strong>
              <span>Chromeのメニューから「アプリをインストール」</span>
            </p>
          </div>
          <p className="safety-note">追加後はアプリのように開けます。通知は別途、ブラウザの許可とPush登録が必要です。</p>
          </section>

          <section className="rail-section">
          <div className="section-heading">
            <Cloud size={20} />
            <div>
              <p>保存</p>
              <h2>バックアップ</h2>
            </div>
          </div>
          <div className="sync-actions">
            <button type="button" onClick={exportBackup}>
              <Download size={16} />
              保存
            </button>
            <label>
              <Upload size={16} />
              読込
              <input accept="application/json" type="file" onChange={(event) => void importBackup(event)} />
            </label>
            <button type="button" onClick={() => void copyShareText()}>
              <Copy size={16} />
              共有
            </button>
          </div>
          <div className="account-sync-panel">
            <strong>アカウント同期</strong>
            <span>{sessionEmail ? sessionEmail : accountStatus}</span>
            <div className="account-sync-form">
              <input
                autoComplete="email"
                inputMode="email"
                name="account-email"
                value={accountEmail}
                onChange={(event) => setAccountEmail(event.target.value)}
                placeholder="メール"
                type="email"
              />
              {sessionEmail ? (
                <>
                  <button type="button" onClick={() => void claimAccountSync()}>
                    紐付け
                  </button>
                  <button type="button" onClick={() => void loadAccountSync()}>
                    復元
                  </button>
                  <button type="button" onClick={() => void signOutAccount()}>
                    ログアウト
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => void sendLoginLink()}>
                  リンク送信
                </button>
              )}
            </div>
            <small>{accountStatus}</small>
          </div>
          <div className="cloud-danger-zone">
            <span>{cloudSyncPaused ? 'クラウド同期は停止中です' : '端末キーでクラウド保存中'}</span>
            {cloudSyncPaused ? (
              <button type="button" onClick={resumeCloudSync}>
                同期再開
              </button>
            ) : (
              <button type="button" onClick={() => void deleteCloudState()}>
                クラウド削除
              </button>
            )}
          </div>
          <div className="capability-list compact-capabilities">
            <p>
              <Share2 size={15} />
              PWA
            </p>
            <p>
              <Mail size={15} />
              通知連携
            </p>
            <p>
              <FileText size={15} />
              JSON
            </p>
            <p>
              <Tag size={15} />
              ロット
            </p>
          </div>
          <div className="legal-links">
            <button type="button" onClick={() => setLegalPanel('privacy')}>
              プライバシー
            </button>
            <button type="button" onClick={() => setLegalPanel('terms')}>
              利用条件
            </button>
          </div>
          </section>

          <section className="rail-section source-summary">
          <div className="section-heading">
            <Database size={20} />
            <div>
              <p>参照</p>
              <h2>参照元</h2>
            </div>
          </div>
          <div className="source-summary-list">
            {referenceSources.slice(0, 4).map((source) => (
              <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
                <span>{source.publisher}</span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
          <p className="safety-note">期限は目安です。包装表示、保存温度、開封状態を優先してください。</p>
          </section>
        </section>
      </details>

      {tourOpen ? (
        <div className="tour-overlay" role="presentation">
          <section
            aria-describedby="tour-body"
            aria-labelledby="tour-title"
            aria-modal="true"
            className="tour-dialog"
            role="dialog"
          >
            <div className="tour-header">
              <div>
                <span className="tour-kicker">食材期限帳の使い方</span>
                <h2 id="tour-title">最初の3分で整える</h2>
              </div>
              <button className="tour-close" type="button" onClick={closeTour} aria-label="ツアーを閉じる">
                ×
              </button>
            </div>
            <div className="tour-layout">
              <div className="tour-step-rail" aria-label="ツアーのステップ">
                {tourSteps.map((step, index) => {
                  const StepIcon = step.icon
                  return (
                    <button
                      aria-current={index === tourStep ? 'step' : undefined}
                      className={index === tourStep ? 'tour-step-button is-current' : 'tour-step-button'}
                      key={step.label}
                      type="button"
                      onClick={() => setTourStep(index)}
                    >
                      <span className="tour-step-icon">
                        <StepIcon size={17} />
                      </span>
                      <span className="tour-step-text">
                        <span>STEP {step.step}</span>
                        <strong>{step.label}</strong>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="tour-copy">
                <div className="tour-copy-top">
                  <span className="tour-step-number">STEP {tourStepData.step}</span>
                  <span className="tour-mini-label">{tourStepData.label}</span>
                </div>
                <h3>{tourStepData.title}</h3>
                <p id="tour-body">{tourStepData.body}</p>
                <div className="tour-preview">
                  <span>この画面で見るもの</span>
                  <strong>{tourStepData.preview}</strong>
                </div>
              </div>
            </div>
            <div className="tour-actions">
              <button className="ghost-button" type="button" onClick={goToPreviousTourStep} disabled={tourStep === 0}>
                戻る
              </button>
              <button className="tour-target" type="button" onClick={goToTourTarget}>
                {tourStepData.actionLabel}
              </button>
              <button className="primary-button" type="button" onClick={goToNextTourStep}>
                {tourStep === tourSteps.length - 1 ? 'はじめる' : '次へ'}
              </button>
              <button className="tour-skip" type="button" onClick={closeTour}>
                ツアーを閉じる
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {legalPanel ? (
        <div className="tour-overlay" role="presentation">
          <section
            aria-labelledby="legal-title"
            aria-modal="true"
            className="legal-dialog"
            role="dialog"
          >
            <div className="tour-header">
              <div>
                <span className="tour-kicker">食材期限帳</span>
                <h2 id="legal-title">{legalPanel === 'privacy' ? 'プライバシー' : '利用条件'}</h2>
              </div>
              <button className="tour-close" type="button" onClick={() => setLegalPanel(null)} aria-label="閉じる">
                ×
              </button>
            </div>
            {legalPanel === 'privacy' ? (
              <div className="legal-copy">
                <p>在庫、買い物、通知設定はブラウザ内に保存され、クラウド同期が有効な場合はSupabaseにも保存されます。</p>
                <p>端末同期キーはこのブラウザに保存されます。共有端末ではバックアップとクラウド削除を使って管理してください。</p>
                <p>エラー調査のため、端末IDの一部、エラー種別、発生時刻を記録することがあります。食材メモ本文は送信しません。</p>
              </div>
            ) : (
              <div className="legal-copy">
                <p>保存期限は目安です。包装表示、保存温度、開封状態、におい、変色、自治体や公的機関の案内を優先してください。</p>
                <p>体調、乳幼児、妊娠中、高齢者、免疫が弱い方に関わる判断では、安全側に倒して廃棄または専門機関へ相談してください。</p>
                <p>通知やリサーチ結果は補助機能です。通信状態、ブラウザ設定、外部サービスの制限により届かない場合があります。</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
