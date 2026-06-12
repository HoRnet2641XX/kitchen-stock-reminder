import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByLabel('ツアーを閉じる').click()
})

test('食材登録から在庫確認まで操作できる', async ({ page }) => {
  await page.getByRole('button', { name: /登録/ }).click()
  await page.getByRole('combobox', { name: /食材名/ }).fill('テスト納豆')
  await page.getByRole('textbox', { name: '数量' }).fill('2パック')
  await page.getByRole('textbox', { name: '包装の期限' }).fill('2026-06-08')
  await page.getByRole('button', { name: '追加' }).click()

  await page.getByRole('button', { name: /在庫/ }).click()
  await expect(page.getByRole('heading', { name: 'テスト納豆' })).toBeVisible()
  await expect(page.getByText('2パック')).toBeVisible()
})

test('買い物リストを操作できる', async ({ page }) => {
  await page.getByRole('button', { name: /^買い物 \d+$/ }).click()
  await page.getByPlaceholder('追加').fill('味噌')
  await page.getByLabel('買うものを追加').click()
  await expect(page.getByText('味噌')).toBeVisible()
})

test('在庫画面で通知設定を開ける', async ({ page }) => {
  await page.getByRole('button', { name: /^在庫 \d+$/ }).click()
  const drawer = page.locator('details.support-drawer')
  await drawer.locator(':scope > summary').click()

  await expect(drawer).toHaveAttribute('open', '')
  await expect(drawer.getByText('はじめる準備')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'スマホ通知をON' })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'テスト通知' })).toBeVisible()
  await expect(drawer.getByText('LINE通知', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'コード発行' })).toBeVisible()
})

test('初回の通知設定CTAから通知設定へ進める', async ({ page }) => {
  await page.getByRole('button', { name: '通知を整える' }).click()

  const drawer = page.locator('details.support-drawer')
  await expect(drawer).toHaveAttribute('open', '')
  await expect(page.locator('#notification-settings')).toBeVisible()
  await expect(drawer.getByText('LINE通知', { exact: true })).toBeVisible()
})

test('ツアーモーダルから準備とPWA案内へ進める', async ({ page }) => {
  await page.getByLabel('使い方ツアーを開く').click()

  const dialog = page.getByRole('dialog', { name: '最初の3分で整える' })
  await expect(dialog.getByRole('button', { name: '準備', exact: true })).toBeVisible()
  await expect(dialog.getByText('LINE通知・スマホ通知・ホーム画面')).toBeVisible()

  await dialog.getByRole('button', { name: '準備を開く' }).click()

  const drawer = page.locator('details.support-drawer')
  await expect(drawer).toHaveAttribute('open', '')
  await expect(page.locator('#setup-start')).toBeVisible()
  await expect(page.locator('#pwa-guide')).toBeVisible()
  await expect(drawer.getByRole('heading', { name: 'ホーム画面に追加' })).toBeVisible()
})
