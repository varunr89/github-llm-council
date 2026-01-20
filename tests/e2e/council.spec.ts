import { test, expect } from '@playwright/test';

test.describe('LLM Council E2E', () => {
  test('should load the page with all UI elements', async ({ page }) => {
    await page.goto('/');

    // Title
    await expect(page.locator('.title')).toContainText('LLM COUNCIL');

    // Prompt input
    await expect(page.locator('#prompt-input')).toBeVisible();

    // Submit button
    await expect(page.locator('#submit-btn')).toBeVisible();

    // Three council columns
    const columns = page.locator('.council-column');
    await expect(columns).toHaveCount(3);

    // Prompt chips
    const chips = page.locator('.chip');
    await expect(chips).toHaveCount(4);
  });

  test('should populate model selects on load', async ({ page }) => {
    await page.goto('/');

    // Wait for models to load
    await page.waitForSelector('.model-select option:not([value=""])');

    const selects = page.locator('.model-select');
    await expect(selects).toHaveCount(3);

    // Each select should have model options
    for (let i = 0; i < 3; i++) {
      const select = selects.nth(i);
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
    }
  });

  test('should update prompt input when clicking chip', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('#prompt-input');
    const chip = page.locator('.chip').first();

    const chipPrompt = await chip.getAttribute('data-prompt');
    await chip.click();

    await expect(input).toHaveValue(chipPrompt || '');
  });

  test('should show error state when API fails', async ({ page }) => {
    await page.goto('/');

    // Mock the API to fail
    await page.route('/api/council', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' }),
      });
    });

    await page.locator('#submit-btn').click();

    // Should show error state
    await expect(page.locator('.council-column.error').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.goto('/');

    // Mock slow API
    await page.route('/api/council', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'event: done\ndata: {}\n\n',
      });
    });

    const submitBtn = page.locator('#submit-btn');
    await submitBtn.click();

    // Button should be disabled while loading
    await expect(submitBtn).toBeDisabled();
  });

  test('API /api/models should return model list', async ({ page }) => {
    const response = await page.request.get('/api/models');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('models');
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
  });

  test('API /api/council should return 400 for missing prompt', async ({ page }) => {
    const response = await page.request.post('/api/council', {
      data: { models: ['gpt-5'] },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Prompt');
  });

  test('API /api/council should return 400 for empty models', async ({ page }) => {
    const response = await page.request.post('/api/council', {
      data: { prompt: 'test', models: [] },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('model');
  });
});
