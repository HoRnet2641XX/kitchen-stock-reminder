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
  await expect(drawer.getByText('登録前提')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Push登録' })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'サーバー確認' })).toBeVisible()
  await expect(drawer.getByText('LINE通知', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'コード発行' })).toBeVisible()
})
