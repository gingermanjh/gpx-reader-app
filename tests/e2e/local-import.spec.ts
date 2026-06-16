import { expect, test } from '@playwright/test';
import path from 'node:path';

test('demo works when map tiles fail and does not upload GPX bytes', async ({ page }) => {
  const observedRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    observedRequests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
    if (request.url().includes('tile.openstreetmap.org')) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await page.getByRole('button', { name: /load demo/i }).click();
  await expect(page.getByText(/Track distance/i)).toBeVisible();

  const trackDistanceCard = page.locator('.metric-card').filter({ hasText: 'Track distance' });
  await expect(trackDistanceCard).toHaveCSS('overflow', 'visible');
  await trackDistanceCard.locator('.info-tooltip').hover();
  const summaryTooltip = trackDistanceCard.locator('.info-tooltip__content');
  await expect(summaryTooltip).toHaveCSS('opacity', '1');
  await expect(summaryTooltip).toHaveCSS('pointer-events', 'auto');
  const tooltipBox = await summaryTooltip.boundingBox();
  expect(tooltipBox).not.toBeNull();
  await expect(page.getByText(/GPX structure/i)).toBeVisible();
  await expect(page.getByText(/트랙 시작/i)).toBeVisible();
  const trackStartTooltip = page.locator('.endpoint-tooltip--track-start');
  await expect(trackStartTooltip).toBeVisible();
  const trackStartBox = await trackStartTooltip.boundingBox();
  expect(trackStartBox).not.toBeNull();
  if (!trackStartBox) throw new Error('track start tooltip was not measurable');
  expect(trackStartBox.x).toBeGreaterThan(48);
  expect(trackStartBox.y).toBeGreaterThan(48);
  await expect(page.getByText(/트랙 종료/i)).toBeVisible();
  await expect(page.getByText(/min 45 m/i)).toBeVisible();
  await expect(page.getByText(/누적 상승/i).first()).toBeVisible();
  await expect(page.getByText(/마지막 지점/i).first()).toBeVisible();
  await expect(page.getByText(/루트 시작/i)).toBeVisible();
  await expect(page.getByText(/루트 종료/i)).toBeVisible();
  await expect(page.getByText(/레이스 전 코스 전략/i)).toBeVisible();
  await expect(page.getByText(/Grade distribution/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Split planner' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aid station timeline' })).toBeVisible();
  await page.getByPlaceholder(/예: 1:45:00/i).fill('1:00:00');
  await page.getByPlaceholder(/예: 2:30:00/i).fill('1:20:00');
  await expect(page.getByRole('columnheader', { name: '권장 페이스' })).toBeVisible();
  await expect(page.getByText(/입력값 반영 위치/i)).toBeVisible();
  await expect(page.getByText(/현재 목표 완주 시간은 1:00:00입니다/i)).toBeVisible();
  await expect(page.getByText(/현재 컷오프 시간은 1:20:00입니다/i)).toBeVisible();
  await expect(page.locator('.aid-stop').getByText(/컷오프 여유/i)).toBeVisible();
  await expect(page.getByText(/Race context checklist/i)).toBeVisible();
  await page.getByPlaceholder(/예: 낮 28℃, 습도 높음/i).fill('낮 28℃');
  await expect(page.getByText(/수분\/전해질/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /전체 리포트 PNG 내보내기/i })).toBeVisible();
  const resetZoom = page.getByRole('button', { name: /Reset zoom/i });
  await expect(resetZoom).toBeDisabled();
  const elevationChart = page.getByRole('img', { name: /Elevation profile chart/i });
  await elevationChart.scrollIntoViewIfNeeded();
  const elevationChartBox = await elevationChart.boundingBox();
  expect(elevationChartBox).not.toBeNull();
  if (!elevationChartBox) throw new Error('elevation chart was not measurable');
  await page.mouse.move(elevationChartBox.x + elevationChartBox.width * 0.3, elevationChartBox.y + elevationChartBox.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(elevationChartBox.x + elevationChartBox.width * 0.62, elevationChartBox.y + elevationChartBox.height * 0.55, { steps: 8 });
  await page.mouse.up();
  await expect(resetZoom).toBeEnabled();
  await resetZoom.click();
  await expect(resetZoom).toBeDisabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /전체 리포트 PNG 내보내기/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/gpx-race-report-demo\.gpx\.png/);
  await expect(page.getByText(/Tile unavailable: vector fallback active/i)).toBeVisible({ timeout: 10_000 });
  expect(observedRequests.join('\n')).not.toContain('<gpx');
});

test('local file import shows geometry and does not put filename in network query/body', async ({ page }) => {
  const observedRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    observedRequests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
    if (request.url().includes('tile.openstreetmap.org')) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(path.resolve('tests/fixtures/mixed-entities.gpx'));
  await expect(page.getByText(/Track distance/i)).toBeVisible();
  await expect(page.getByText('Water').first()).toBeVisible();
  const network = observedRequests.join('\n');
  expect(network).not.toContain('mixed-entities.gpx');
  expect(network).not.toContain('<gpx');
});
