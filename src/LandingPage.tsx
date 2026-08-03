import { useState } from 'react'
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Home,
  MessageCircle,
  PackagePlus,
  ShoppingBasket,
  Snowflake,
} from 'lucide-react'

type DoubtKey = 'remaining' | 'missing' | 'expiry'

const doubtItems: Array<{
  key: DoubtKey
  label: string
  question: string
  answer: string
  action: string
}> = [
  {
    key: 'remaining',
    label: 'まだある？',
    question: '豆腐、まだ冷蔵庫にあったっけ。',
    answer: '登録した食材を、期限が近い順に今日見る画面へ出します。',
    action: '料理前に確認',
  },
  {
    key: 'missing',
    label: '足りない？',
    question: '卵を買うべきか、家で余っているか。',
    answer: '使い切りや不足から、買い物リストに残すものを分けます。',
    action: '買う前に見る',
  },
  {
    key: 'expiry',
    label: '忘れそう？',
    question: '冷凍した鶏肉、いつまでに使う？',
    answer: '冷蔵、冷凍、常温の目安と通知で、忘れる前に気づけます。',
    action: '通知を整える',
  },
]

const sceneItems = [
  {
    src: '/lp-images/ingredients-counter.jpg',
    alt: '豆腐、卵、葉物野菜、冷凍用の肉、米が台所の作業台に並んでいる',
    label: '料理前',
    title: '残っているものを見る',
    text: '冷蔵庫を開ける前に、使える食材を短く確認。',
  },
  {
    src: '/lp-images/shopping-table.jpg',
    alt: '買い物袋から野菜、豆腐、卵、米が台所のテーブルに出されている',
    label: '買い物後',
    title: '今日買ったものから登録',
    text: '全部ではなく、忘れたくない食材だけで始められます。',
  },
  {
    src: '/lp-images/storage-trio.jpg',
    alt: '冷蔵庫、冷凍庫、常温棚に分けて保存された食材',
    label: '保存',
    title: '冷蔵、冷凍、常温を分ける',
    text: '保存場所ごとの目安を一緒に持てます。',
  },
]

const appFlowItems = [
  {
    href: '/app#today-check',
    icon: ChefHat,
    label: 'まず今日を見る',
    title: '期限が近い食材を確認',
    text: '通知設定がまだなら、ここから整えられます。',
  },
  {
    href: '/app#add-food',
    icon: PackagePlus,
    label: '食材を登録',
    title: '買ったものを一品だけ入れる',
    text: '保存場所と買った日だけで始められます。',
  },
  {
    href: '/app#inventory-list',
    icon: ClipboardList,
    label: '在庫を見る',
    title: '冷蔵、冷凍、常温を見分ける',
    text: '期限、残量、保存場所をまとめて確認します。',
  },
  {
    href: '/app#shopping-list',
    icon: ShoppingBasket,
    label: '買い物を見る',
    title: '足りないものだけ買う',
    text: '使い切りと不足を分けて持ち出せます。',
  },
]

const selectedDoubt = (key: DoubtKey) => doubtItems.find((item) => item.key === key) ?? doubtItems[0]

function BowlLogo() {
  return (
    <span className="lp-logo-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <path className="lp-logo-rice" d="M13.8 22.5c1.4-6.5 5.8-10.5 10.3-10.5 4.6 0 8.8 4 10.1 10.5" />
        <path className="lp-logo-body" d="M10.4 22.5h27.2c-.7 8.1-5.6 13.1-13.6 13.1s-12.9-5-13.6-13.1Z" />
        <path className="lp-logo-line" d="M9 22.5h30" />
        <path className="lp-logo-line" d="M18.2 37h11.6" />
        <path className="lp-logo-grain" d="M18.3 17.7c1.2-1.6 2.7-1.8 4-.5" />
        <path className="lp-logo-grain" d="M24.8 15.7c1.8-.8 3.2-.3 4.1 1.4" />
        <path className="lp-logo-grain" d="M15.9 20.4c1.5-.9 2.9-.7 4.1.5" />
      </svg>
    </span>
  )
}

export function LandingPage() {
  const [activeDoubt, setActiveDoubt] = useState<DoubtKey>('remaining')
  const current = selectedDoubt(activeDoubt)

  return (
    <div className="landing-page">
      <a className="lp-skip" href="#lp-main">
        本文へ移動
      </a>
      <header className="lp-header">
        <a className="lp-brand" href="/" aria-label="食材期限帳 トップ">
          <BowlLogo />
          <span>
            <strong>食材期限帳</strong>
            <small>冷蔵庫の前で見る台所メモ</small>
          </span>
        </a>
        <nav className="lp-nav" aria-label="ランディングページ">
          <a href="#lp-app-flow">アプリの流れ</a>
          <a href="#lp-scenes">使う場面</a>
          <a href="#lp-reminder">通知</a>
          <a className="lp-nav-action" href="/app#today-check">
            アプリを開く
          </a>
        </nav>
      </header>

      <main id="lp-main">
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-hero-media">
            <img
              src="/lp-images/hero-kitchen.jpg"
              alt="冷蔵庫を開けた台所の作業台に、豆腐や卵、葉物野菜とスマートフォンが置かれている"
              width="1672"
              height="941"
              fetchPriority="high"
            />
          </div>
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <p className="lp-kicker">自炊の食材メモ</p>
              <h1 id="lp-hero-title">
                <span>冷蔵庫の迷いを、</span>
                <span>ひとつ減らす。</span>
              </h1>
              <p className="lp-hero-lead">
                残りもの、足りないもの、期限が近いものを、料理前・買い物前に短く確認できます。
              </p>
              <div className="lp-hero-actions" aria-label="主要操作">
                <a className="lp-button lp-button-primary" href="/app#today-check">
                  <ChefHat size={17} strokeWidth={2.1} aria-hidden="true" />
                  アプリを開く
                </a>
                <a className="lp-button lp-button-secondary" href="#lp-small-start">
                  <PackagePlus size={17} strokeWidth={2.1} aria-hidden="true" />
                  使い始めを見る
                </a>
              </div>
            </div>

            <div className="lp-hero-visual" aria-label="食材期限帳の画面プレビュー">
              <div className="lp-phone-shell">
                <img
                  src="/landing-app-preview.png"
                  alt="食材期限帳の今日見る画面"
                  width="390"
                  height="844"
                  fetchPriority="high"
                />
              </div>
              <div className="lp-counter-note" aria-hidden="true">
                <span>次に見るもの</span>
                <strong>あと1日の食材</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-question-strip" aria-label="よくある迷い">
          <span>まだ豆腐あった？</span>
          <span>卵は買う？</span>
          <span>冷凍したのいつ？</span>
          <span>期限は近い？</span>
        </section>

        <section className="lp-app-flow" id="lp-app-flow" aria-labelledby="lp-app-flow-title">
          <div className="lp-flow-lead">
            <h2 id="lp-app-flow-title">アプリを開いたら、この順番で。</h2>
            <p>最初に見る場所を迷わないように、よく使う画面へそのまま進めます。</p>
            <div className="lp-flow-actions">
              <a className="lp-button lp-button-primary" href="/app#today-check">
                <ChefHat size={17} strokeWidth={2.1} aria-hidden="true" />
                アプリを開く
              </a>
              <a className="lp-button lp-button-secondary" href="/app#add-food">
                <PackagePlus size={17} strokeWidth={2.1} aria-hidden="true" />
                食材を登録する
              </a>
            </div>
          </div>
          <div className="lp-flow-links" aria-label="アプリ内の主要画面">
            {appFlowItems.map((item) => {
              const Icon = item.icon
              return (
                <a className="lp-flow-link" href={item.href} key={item.href}>
                  <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </a>
              )
            })}
          </div>
        </section>

        <section className="lp-image-story" id="lp-scenes" aria-labelledby="lp-scenes-title">
          <div className="lp-section-copy">
            <p className="lp-kicker">使う場面</p>
            <h2 id="lp-scenes-title">買う、しまう、使うを一枚の流れに。</h2>
            <p>
              食材期限帳は、きれいに管理するためよりも、毎日の小さな判断を早くするためのメモです。
            </p>
          </div>
          <div className="lp-scene-grid">
            {sceneItems.map((item) => (
              <article className="lp-scene" key={item.src}>
                <img src={item.src} alt={item.alt} width="1672" height="941" loading="eager" decoding="async" />
                <div>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-doubt-section" id="lp-doubt" aria-labelledby="lp-doubt-title">
          <div className="lp-section-copy">
            <p className="lp-kicker">迷いを減らす</p>
            <h2 id="lp-doubt-title">在庫管理ではなく、迷いをメモにする。</h2>
            <p>
              最初から冷蔵庫を全部登録する必要はありません。気になった食材だけ入れると、次の料理と買い物で見返せます。
            </p>
          </div>

          <div className="lp-doubt-board">
            <div className="lp-doubt-tabs" role="tablist" aria-label="迷いの種類">
              {doubtItems.map((item) => (
                <button
                  aria-controls="lp-doubt-panel"
                  aria-selected={item.key === activeDoubt}
                  className={item.key === activeDoubt ? 'is-active' : ''}
                  key={item.key}
                  role="tab"
                  type="button"
                  onClick={() => setActiveDoubt(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <article className="lp-doubt-panel" id="lp-doubt-panel" role="tabpanel">
              <span>{current.action}</span>
              <h3>{current.question}</h3>
              <p>{current.answer}</p>
            </article>
          </div>
        </section>

        <section className="lp-small-start" id="lp-small-start" aria-labelledby="lp-small-start-title">
          <div className="lp-small-start-card">
            <figure className="lp-start-image">
              <img
                src="/lp-images/shopping-table.jpg"
                alt="買い物袋から出した野菜や豆腐、卵が台所のテーブルに並んでいる"
                width="1672"
                height="941"
                loading="eager"
                decoding="async"
              />
            </figure>
            <div className="lp-start-copy">
              <p className="lp-kicker">最初の一手</p>
              <h2 id="lp-small-start-title">今日買ったものから始める。</h2>
              <p>
                食材名、保存場所、買った日を入れるだけ。期限の目安や参照元は、必要な時だけ確認できます。
              </p>
              <ol className="lp-start-steps">
                <li>
                  <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
                  <span>まず一品だけ登録</span>
                </li>
                <li>
                  <CalendarClock size={18} strokeWidth={2.1} aria-hidden="true" />
                  <span>期限が近い順に見る</span>
                </li>
                <li>
                  <ShoppingBasket size={18} strokeWidth={2.1} aria-hidden="true" />
                  <span>足りないものだけ買う</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="lp-section lp-reminder-section" id="lp-reminder" aria-labelledby="lp-reminder-title">
          <figure className="lp-reminder-image">
            <img
              src="/lp-images/reminder-evening.jpg"
              alt="夕方の台所で、食材の横に通知画面をぼかしたスマートフォンが置かれている"
              width="1672"
              height="941"
              loading="eager"
              decoding="async"
            />
          </figure>
          <div className="lp-reminder-copy">
            <p className="lp-kicker">通知と保存</p>
            <h2 id="lp-reminder-title">忘れそうな食材は、先に知らせる。</h2>
            <p>
              期限2日前と当日の通知、LINE連携、ホーム画面追加を最初に整えられます。設定名は生活の言葉に寄せています。
            </p>
            <div className="lp-reminder-list" aria-label="通知と保存のサポート">
              <article>
                <Bell size={19} strokeWidth={2.1} aria-hidden="true" />
                <span>スマホ通知</span>
                <p>期限が近い食材を、料理前に思い出す。</p>
              </article>
              <article>
                <MessageCircle size={19} strokeWidth={2.1} aria-hidden="true" />
                <span>LINE通知</span>
                <p>いつもの連絡先で、見落としにくくする。</p>
              </article>
              <article>
                <Home size={19} strokeWidth={2.1} aria-hidden="true" />
                <span>ホーム画面</span>
                <p>買い物前にすぐ開ける場所へ置く。</p>
              </article>
              <article>
                <Snowflake size={19} strokeWidth={2.1} aria-hidden="true" />
                <span>保存目安</span>
                <p>冷蔵、冷凍、常温の違いを一緒に見る。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-final-cta" aria-labelledby="lp-final-title">
          <img
            src="/lp-images/table-meal.jpg"
            alt=""
            width="1672"
            height="941"
            loading="eager"
            decoding="async"
            aria-hidden="true"
          />
          <div className="lp-final-content">
            <ClipboardList size={24} strokeWidth={2.1} aria-hidden="true" />
            <h2 id="lp-final-title">次に気になる食材を、ひとつだけ入れてみる。</h2>
            <p>今日の食材から始めれば、在庫も買い物も通知もあとから育ちます。</p>
            <a className="lp-button lp-button-primary" href="/app#add-food">
              <PackagePlus size={17} strokeWidth={2.1} aria-hidden="true" />
              食材を登録する
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span>食材期限帳</span>
        <a href="/app#today-check">アプリへ</a>
        <a href="/app#inventory-list">在庫を見る</a>
        <a href="/app#shopping-list">買い物を見る</a>
      </footer>

      <nav className="lp-mobile-dock" aria-label="アプリへの近道">
        <a href="/app#today-check">今日見る</a>
        <a className="is-primary" href="/app#today-check">
          アプリを開く
        </a>
        <a href="/app#add-food">食材登録</a>
      </nav>
    </div>
  )
}
