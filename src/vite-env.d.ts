/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_LINE_OFFICIAL_ACCOUNT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type BarcodeFormat = 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e' | 'qr_code'

type DetectedBarcode = {
  rawValue: string
}

declare class BarcodeDetector {
  constructor(options?: { formats?: BarcodeFormat[] })
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>
}

type SpeechRecognitionResultAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  readonly length: number
  item(index: number): SpeechRecognitionResultAlternative
  [index: number]: SpeechRecognitionResultAlternative
}

type SpeechRecognitionResultList = {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList
}

declare class SpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start(): void
}

interface Window {
  BarcodeDetector: typeof BarcodeDetector
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: typeof SpeechRecognition
}
