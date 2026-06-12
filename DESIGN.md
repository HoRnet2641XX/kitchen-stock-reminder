---
name: 食材期限帳
description: 自炊の食材期限、在庫、買い物、通知をスマホで確認する台所メモアプリ
colors:
  leaf-calm: "oklch(38% 0.078 144)"
  leaf-soft: "oklch(94.5% 0.038 132)"
  rice-paper: "oklch(98.8% 0.008 101)"
  rice-yellow: "oklch(91% 0.065 92)"
  karashi-soft: "oklch(94.5% 0.064 89)"
  shoyu-soft: "oklch(39% 0.047 63)"
  line-calm: "oklch(84.5% 0.015 101)"
typography:
  headline:
    fontFamily: "\"LINE Seed JP\", \"Noto Sans JP\", \"Hiragino Sans\", \"Hiragino Kaku Gothic ProN\", \"BIZ UDPGothic\", \"Yu Gothic\", Meiryo, sans-serif"
    fontSize: "20px"
    fontWeight: 780
    lineHeight: 1.32
  title:
    fontFamily: "\"LINE Seed JP\", \"Noto Sans JP\", \"Hiragino Sans\", \"Hiragino Kaku Gothic ProN\", \"BIZ UDPGothic\", \"Yu Gothic\", Meiryo, sans-serif"
    fontSize: "15px"
    fontWeight: 780
    lineHeight: 1.35
  body:
    fontFamily: "\"LINE Seed JP\", \"Noto Sans JP\", \"Hiragino Sans\", \"Hiragino Kaku Gothic ProN\", \"BIZ UDPGothic\", \"Yu Gothic\", Meiryo, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.7
  label:
    fontFamily: "\"LINE Seed JP\", \"Noto Sans JP\", \"Hiragino Sans\", \"Hiragino Kaku Gothic ProN\", \"BIZ UDPGothic\", \"Yu Gothic\", Meiryo, sans-serif"
    fontSize: "12px"
    fontWeight: 760
    lineHeight: 1.35
rounded:
  sm: "7px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.leaf-calm}"
    textColor: "{colors.rice-paper}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  card-quiet:
    backgroundColor: "{colors.rice-paper}"
    textColor: "{colors.shoyu-soft}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: 食材期限帳

## 1. Overview

**Creative North Star: "台所の小さな献立メモ"**

このUIは、冷蔵庫の前でスマホを片手に開くためのプロダクトUI。派手さよりも、今日の判断を短時間で終えることを優先する。料理メディアの親しみやすさは持つが、カードを盛りすぎず、家のメモ帳のように落ち着いて読める密度にする。

生成AIっぽい抽象装飾、紫青グラデーション、意味のないアイコンカード、技術者向けの設定文言は避ける。

**Key Characteristics:**
- 緑、黄色、白を基調にした安心感
- 期限、買い物、登録、通知の4つだけを強い入口にする
- 詳細は展開に逃がし、初期表示を判断用に圧縮する

## 2. Colors

葉物野菜の緑、炊いた米の白、からしや醤油を思わせる控えめなアクセントを使う。

### Primary
- **Leaf Calm** (`oklch(38% 0.078 144)`): 主操作、現在地、良好な状態。

### Secondary
- **Rice Yellow** (`oklch(91% 0.065 92)`): 注意喚起、期限が近い状態。強すぎる警告色にはしない。

### Tertiary
- **Shoyu Soft** (`oklch(39% 0.047 63)`): 重要な数字や調味料的なアクセント。

### Neutral
- **Rice Paper** (`oklch(98.8% 0.008 101)`): 画面背景とカード。
- **Line Calm** (`oklch(84.5% 0.015 101)`): 境界線。

### Named Rules
**The Kitchen Calm Rule.** 黒は本文色としても強くしすぎない。背景やボタンに純黒を使わない。

## 3. Typography

**Display Font:** LINE Seed JP, Noto Sans JP, Hiragino Sans fallback  
**Body Font:** LINE Seed JP, Noto Sans JP, Hiragino Sans fallback  
**Label/Mono Font:** system monospace only for codes when needed

**Character:** 日本語の字形が中華フォントに見えないことを優先する。見出しは大きくしすぎず、スマホで読める現実的な階層にする。

### Hierarchy
- **Headline** (780, 20px, 1.32): 今日の判断や初回の主見出し。
- **Title** (780, 15px, 1.35): セクション見出しと食材名。
- **Body** (500, 12px, 1.7): 説明文と状態文。
- **Label** (760, 12px, 1.35): ボタン、タブ、短い補足。10pxは極短ラベルだけ。

### Named Rules
**The Twelve First Rule.** 読ませる文字は12px以上。10pxは読ませないラベルに限定する。

## 4. Elevation

影は控えめに使う。カードの立体感より、背景色と境界線で階層を作る。固定ナビやモーダルだけ、薄い台所照明のような影を使う。

### Shadow Vocabulary
- **Floating Nav** (`0 10px 28px oklch(31% 0.026 84 / 0.16)`): 下部ナビ専用。
- **Quiet Surface** (`none`): 通常カード、在庫行、設定パネル。

### Named Rules
**The Flat Counter Rule.** 通常の情報は作業台に置いた紙のように平らに見せる。影でカードを増やさない。

## 5. Components

### Buttons
- **Shape:** 7pxから8px。丸すぎるピルはフィルターだけ。
- **Primary:** Leaf Calm背景、Rice Paper文字、40px前後の高さ。
- **Hover / Focus:** 背景を少し濃くし、focus-visible outlineを維持する。
- **Secondary:** 白地、薄い境界線。主操作と同じ重さにしない。

### Chips
- **Style:** フィルターや状態だけに使う。短い文言、横スクロール許容。
- **State:** 選択中はLeaf Soft背景とLeaf Calm文字。

### Cards / Containers
- **Corner Style:** 8px基本、外側の大きいまとまりだけ12px。
- **Background:** Rice Paperまたは薄い黄色。ネストしたカードを増やさない。
- **Shadow Strategy:** 基本なし。
- **Internal Padding:** 12px基準、密な一覧は上下10px。

### Inputs / Fields
- **Style:** 白地、薄い境界線、7px角丸。
- **Focus:** からし色のfocus-visible outline。
- **Error / Disabled:** 状態文を近くに置く。エラーだけを赤く叫ばせない。

### Navigation
- 下部固定ナビは4項目まで。数値バッジは意味が伝わる短い単位を使う。ナビにコンテンツが隠れないよう、主要画面下部に十分な余白を持たせる。

### Setup Panel
- 初回設定は「LINE」「スマホ通知」「時間」「ホーム画面」の順に見せる。VAPID、Webhook、APIなどは詳細内に隠す。

## 6. Do's and Don'ts

### Do:
- **Do** 初回は「通知を整える」を明確な一手にする。
- **Do** 在庫カードは食材名、期限、保存場所を先に見せる。
- **Do** OKLCHの緑、黄色、白を中心にする。
- **Do** PWAは「ホーム画面に追加」と呼ぶ。

### Don't:
- **Don't** Push、Webhook、VAPID、APIを初期表示の主文言にする。
- **Don't** 紫青グラデーション、ネオン、抽象オーブ、ガラス風パネルを使う。
- **Don't** 説明カードを増やして初回画面を取扱説明書にする。
- **Don't** 10pxの説明文を長く読ませる。
