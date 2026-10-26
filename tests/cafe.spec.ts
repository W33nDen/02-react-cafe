import { expect, test, type Page } from '@playwright/test';

async function expectStats(
  page: Page,
  good: number,
  neutral: number,
  bad: number,
) {
  const total = good + neutral + bad;
  const positive = total ? Math.round((good / total) * 100) : 0;
  for (const [label, value] of [
    ['Good', good],
    ['Neutral', neutral],
    ['Bad', bad],
    ['Total', total],
    ['Positive', `${positive}%`],
  ]) {
    await expect(
      page.locator('p').filter({ hasText: new RegExp(`^${label}:`) }),
    ).toHaveText(`${label}: ${value}`);
  }
}

test('initial notification, all categories, rounded percentages, and reset', async ({
  page,
}) => {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      messages.push(message.text());
  });
  page.on('pageerror', (error) => messages.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Sip Happens Café' }),
  ).toBeVisible();
  await expect(page.getByText('No feedback yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
  await expect(page.getByText(/^Total:/)).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/desktop-initial.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await expectStats(page, 1, 0, 0);
  await expect(page.getByText('No feedback yet')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  await page.getByRole('button', { name: 'Neutral', exact: true }).click();
  await expectStats(page, 1, 1, 0);
  await page.getByRole('button', { name: 'Bad', exact: true }).click();
  await expectStats(page, 1, 1, 1);
  await page.screenshot({
    path: 'test-results/desktop-votes.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('No feedback yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bad', exact: true }).click();
  await expectStats(page, 0, 0, 1);
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Neutral', exact: true }).click();
  await expectStats(page, 0, 1, 0);

  await page.getByRole('button', { name: 'Reset' }).click();
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Good', exact: true }).click();
  }
  await expectStats(page, 20, 0, 0);
  await page.reload();
  await expect(page.getByText('No feedback yet')).toBeVisible();
  expect(messages).toEqual([]);
});

test('mobile layout and keyboard voting', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Good', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expectStats(page, 1, 0, 0);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expectStats(page, 1, 1, 0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: 'test-results/mobile-votes.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.screenshot({
    path: 'test-results/mobile-reset.png',
    fullPage: true,
  });
});
