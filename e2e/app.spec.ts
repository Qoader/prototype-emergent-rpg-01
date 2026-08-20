import { expect, test } from '@playwright/test';

test.describe('Emberfall shell', () => {
  test('loads the exploration map', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('EMBERFALL')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Emberfall top-down RPG map' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText(/rivers, trees, and houses cannot be crossed/i)).toBeVisible();
  });

  test('toggles mute state through the shell control', async ({ page }) => {
    await page.goto('/');

    const muteButton = page.getByRole('button', { name: 'Mute' });
    await expect(muteButton).toBeVisible();

    await muteButton.click();
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();

    await page.getByRole('button', { name: 'Unmute' }).click();
    await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  });
});
