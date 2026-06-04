import { test, expect } from '@playwright/test';

test.describe('Welcome Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome modal on app load', async ({ page }) => {
    const modal = page.locator('#welcome-modal');
    await expect(modal).toBeVisible();
  });

  test('welcome modal blocks interaction with background', async ({ page }) => {
    const backdrop = page.locator('.modal-backdrop');
    await expect(backdrop).toBeVisible();

    // Verify backdrop covers the entire viewport
    const backdropBox = await backdrop.boundingBox();
    const viewport = page.viewportSize();
    expect(backdropBox.width).toBe(viewport.width);
    expect(backdropBox.height).toBe(viewport.height);
  });

  test('shows SignalWire logo at top of modal', async ({ page }) => {
    const logo = page.locator('.modal-logo');
    await expect(logo).toBeVisible();
  });

  test('has token mode selected by default', async ({ page }) => {
    const tokenBtn = page.locator('[data-mode="token"]');
    await expect(tokenBtn).toHaveClass(/active/);
    await expect(tokenBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch to URL mode', async ({ page }) => {
    const urlBtn = page.locator('[data-mode="url"]');
    await urlBtn.click();

    await expect(urlBtn).toHaveClass(/active/);
    await expect(urlBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify placeholder changes
    const input = page.locator('#auth-input');
    await expect(input).toHaveAttribute('placeholder', /URL/i);
  });

  test('shows error for empty submission', async ({ page }) => {
    const submitBtn = page.locator('#submit-btn');
    await submitBtn.click();

    const error = page.locator('#error-container');
    await expect(error).toContainText(/enter/i);
  });

  test('submit button is full width', async ({ page }) => {
    const submitBtn = page.locator('#submit-btn');
    await expect(submitBtn).toHaveClass(/btn-full-width/);
  });

  test('modal card has max-width of 400px', async ({ page }) => {
    const card = page.locator('.modal-card');
    const styles = await card.evaluate((el) => getComputedStyle(el).maxWidth);
    expect(styles).toBe('400px');
  });

  test('modal cannot be closed by clicking backdrop', async ({ page }) => {
    const backdrop = page.locator('.modal-backdrop');
    const card = page.locator('.modal-card');

    // Click outside the card (on backdrop)
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Modal should still be visible
    await expect(card).toBeVisible();
  });

  test('modal cannot be closed by pressing Escape', async ({ page }) => {
    await page.keyboard.press('Escape');

    const modal = page.locator('#welcome-modal');
    await expect(modal).toBeVisible();
  });

  test('token input uses monospace font', async ({ page }) => {
    const input = page.locator('#auth-input');
    await expect(input).toHaveClass(/input-mono/);
  });

  test('displays loading spinner during URL fetch', async ({ page }) => {
    // Switch to URL mode
    await page.locator('[data-mode="url"]').click();

    // Enter a slow URL (will timeout)
    await page.locator('#auth-input').fill('https://httpstat.us/200?sleep=5000');

    // Click submit
    await page.locator('#submit-btn').click();

    // Verify spinner is visible
    const spinner = page.locator('#submit-spinner');
    await expect(spinner).toBeVisible({ timeout: 1000 });
  });
});
