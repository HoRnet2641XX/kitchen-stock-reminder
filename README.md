# Kitchen Stock Reminder

自炊する人向けの、食材在庫・保存期限・買い物リスト・リマインドを一画面で扱うWebアプリです。

## 機能

- 食材名、数量、保存場所、購入日を登録
- 冷蔵・冷凍・常温ごとの保存期限をリサーチ候補から適用
- 包装の賞味期限/消費期限、開封日、保存場所へ移した日を分けて管理
- 棚・場所、残量、ロット番号、バーコード、メモを記録
- 期限超過、今日まで、リマインド対象を自動分類
- 毎日指定時刻にアプリ起動中のブラウザ通知を送信
- PWA manifest と Service Worker によるホーム画面追加・通知クリック復帰
- 音声入力とブラウザ対応時の画像バーコード読取
- 使い切った食材と定番食材の不足から買い物リストを生成
- 手動の買い物リスト追加、チェック、登録への再利用
- 期限が近い食材から使い切り案を表示
- JSONバックアップ/読み込み、在庫共有テキストコピー
- 公的な参照元URLを期限データに保持
- 公的ソース検索リンクと食材ごとの確認ログ
- Vercel Functions による実リサーチ、商品バーコード照合、通知送信
- OCRによる包装期限日の読み取り
- Supabaseクラウド同期、クラウド削除、メールリンクによるアカウント紐付け
- Web Push購読、Supabase cronによるサーバー側リマインド
- プライバシー/利用条件のアプリ内表示、クライアントエラー記録

## 開発

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test:e2e
```

## 公開設定

Vercel では `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_VAPID_PUBLIC_KEY` を設定します。

Vercel Functions では `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`CRON_SECRET`、`APP_BASE_URL` も使います。

メール/LINEの自動送信を使う場合は任意で追加します。

`RESEND_API_KEY`、`REMINDER_EMAIL_FROM`、`LINE_CHANNEL_ACCESS_TOKEN` を設定すると、メール/LINE通知も有効になります。

Supabase には `supabase/migrations/` のSQLを適用します。

データは `localStorage` にも保存し、Supabase設定がある環境では端末ごとの同期キーでクラウド保存します。期限データは `src/data/foodGuides.ts` に分離しています。
メール送信はResend、LINE送信はLINE Messaging APIのトークンが設定された場合に実行されます。未設定でもWeb PushとWebhook通知は動作します。
