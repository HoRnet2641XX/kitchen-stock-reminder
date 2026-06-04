# Operations

このメモは、公開後に必要な設定と確認手順です。秘密情報はこのファイルに書かず、Vercel/Supabase の環境変数や管理画面で管理します。

## 公開済みの基本構成

- フロントエンド: Vercel
- データ同期: Supabase
- ブラウザ通知: Web Push
- サーバー側リマインド: Supabase cron から `/api/send-reminders` を定期実行
- 手動/外部監視用ヘルスチェック: `/api/health-check`

## 必須の環境変数

Vercel の Production 環境に以下を設定します。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`
- `VITE_VAPID_PUBLIC_KEY`
- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

## 任意の通知プロバイダー

メール通知を有効にする場合:

- Resend で送信元ドメインを検証する
- Resend の API key を発行する
- Vercel に `RESEND_API_KEY` を設定する
- 独自ドメイン送信を使う場合は `REMINDER_EMAIL_FROM` を設定する
- Vercel を再デプロイする

LINE通知を有効にする場合:

- LINE Developers で Messaging API チャネルを作成する
- チャネルアクセストークンを発行する
- Vercel に `LINE_CHANNEL_ACCESS_TOKEN` を設定する
- アプリの LINE 欄には送信先の LINE user ID を入れる
- 代替として、LINE連携済みの HTTPS Webhook URL を入れると Webhook 通知として送れる
- Vercel を再デプロイする

## Supabase

`supabase/migrations/` の SQL を本番プロジェクトに適用します。

適用後に以下を確認します。

- `kitchen_stock_profiles` が作成されている
- `kitchen_push_subscriptions` が作成されている
- `kitchen_client_events` が作成されている
- RPC `get_kitchen_operational_status` が実行できる
- `cron.job` に `kitchen_stock_reminders` があり、`active = true`

## 動作確認

公開URLの確認:

```bash
curl -I https://kitchen-stock-reminder.vercel.app
```

公開ヘルスチェック:

```bash
curl -sS https://kitchen-stock-reminder.vercel.app/api/health-check
```

管理ヘルスチェック:

```bash
curl -sS https://kitchen-stock-reminder.vercel.app/api/health-check \
  -H "x-cron-secret: $CRON_SECRET"
```

リマインド手動確認:

```bash
curl -sS https://kitchen-stock-reminder.vercel.app/api/send-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```

## 実機で確認すること

Web Push はブラウザと端末の通知権限に依存するため、実機で確認します。

- Android Chrome またはデスクトップ Chrome で公開URLを開く
- アプリ内の Push 登録を実行する
- 通知許可を許可する
- サーバー確認を実行する
- 期限2日前以内の食材を登録し、リマインドが届くか確認する

iPhone では、Safari からホーム画面に追加した PWA と通知許可の組み合わせで確認します。

## まだ人の操作が必要なもの

- Resend のアカウント作成、ドメイン検証、API key 発行
- LINE Developers のチャネル作成、アクセストークン発行、送信先 user ID の取得
- Supabase Auth のメールリンクを実際のメールボックスで開く確認
- 実際の食品パッケージ写真で OCR の読み取り精度確認
- 実機ブラウザで通知権限を許可した状態の Push 到達確認
