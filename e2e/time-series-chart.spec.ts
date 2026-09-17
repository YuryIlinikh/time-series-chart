import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

function collectRuntimeErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (error: Error) => errors.push(error));
  return errors;
}

async function showMiddleDateTooltip(
  chart: ReturnType<Page['getByRole']>,
  interaction: 'mouse' | 'touch' = 'mouse',
): Promise<void> {
  const box = await chart.boundingBox();
  if (!box) throw new Error('Chart has no layout box');

  await chart.dispatchEvent(interaction === 'touch' ? 'pointerdown' : 'pointermove', {
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    pointerType: interaction,
  });
}

test('renders the real chart without runtime errors', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
  const chart = page.getByRole('img', { name: /time series chart/i });
  await expect(chart).toBeVisible();
  const box = await chart.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);
  expect(runtimeErrors).toEqual([]);
});

test('shows reference values in the shared tooltip', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto('/');
  const chart = page.getByRole('img', { name: /time series chart/i });
  await expect(chart).toBeVisible();
  await showMiddleDateTooltip(chart);
  await expect(page.getByText('12.06.2026')).toBeVisible();
  await expect(page.getByText('44.36')).toBeVisible();
  await expect(page.getByText('1.23')).toBeVisible();
  await expect(page.getByText('161.47')).toBeVisible();
  await expect(page.getByText('36', { exact: true })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

for (const viewport of viewports) {
  test(`remains functional at ${viewport.name} viewport`, async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize(viewport);
    await page.goto('/');

    const chart = page.getByRole('img', { name: /time series chart/i });
    const container = page.locator('.demo__chart-shell');
    await expect(chart).toBeVisible();
    await expect(container).toBeVisible();

    const dimensions = await page.evaluate(() => {
      const chartElement = document.querySelector<HTMLElement>('.time-series-chart');
      const containerElement = document.querySelector<HTMLElement>('.demo__chart-shell');
      if (!chartElement || !containerElement) return null;

      const chartBox = chartElement.getBoundingClientRect();
      const containerBox = containerElement.getBoundingClientRect();
      return {
        chartWidth: chartBox.width,
        chartHeight: chartBox.height,
        containerWidth: containerBox.width,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(dimensions).not.toBeNull();
    expect(dimensions!.chartWidth).toBeGreaterThan(0);
    expect(dimensions!.chartHeight).toBeGreaterThan(0);
    expect(dimensions!.chartWidth).toBeLessThanOrEqual(dimensions!.containerWidth + 1);
    expect(dimensions!.hasHorizontalOverflow).toBe(false);
    expect(runtimeErrors).toEqual([]);
  });
}

test('shows the tooltip after touch at a narrow viewport', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const chart = page.getByRole('img', { name: /time series chart/i });
  await expect(chart).toBeVisible();
  await showMiddleDateTooltip(chart, 'touch');
  await expect(page.getByText('12.06.2026')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
