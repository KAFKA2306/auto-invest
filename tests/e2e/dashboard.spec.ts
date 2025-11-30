import { test, expect } from "@playwright/test";

const sampleMetrics = {
  last_updated: "2025-11-30T00:00:00Z",
  sharpe_ratio: 0.68,
  max_drawdown: -0.3,
  win_rate: 0.55,
  profit_factor: 1.1,
  leverage: {
    as_of: "2025-11-28",
    symbol: "QQQ",
    sharpe_ratio_annual: 0.7,
    kelly_leverage: 2.2,
    fractional_kelly: 1.1,
    volatility_annual: 0.22,
    suggested: { alpha: 0.5, vol_target_annual: 0.2, cap: 2, L_kelly: 2.2, L_vol: 0.9, L_blend: 1.55 },
    risk: {
      downside_deviation_annual: 0.15,
      sortino_ratio_annual: 0.44,
      max_drawdown: -0.57,
      calmar_ratio: 0.25,
      es_95: -0.0332,
      vol_of_vol: 0.11,
      beta_spx: 1.0,
      corr_spx: 0.8,
    },
    series: [
      {
        date: "2025-11-26",
        price_close: 350,
        volatility_score: 0.18,
        realized_vol_annual: 0.2,
        ewma_vol_annual: 0.17,
        kelly_leverage: 2.1,
        fractional_kelly: 1.05,
        L_blend: 1.5,
        max_drawdown: -0.1,
      },
      {
        date: "2025-11-27",
        price_close: 352,
        volatility_score: 0.19,
        realized_vol_annual: 0.22,
        ewma_vol_annual: 0.18,
        kelly_leverage: 2.2,
        fractional_kelly: 1.1,
        L_blend: 1.55,
        max_drawdown: -0.08,
      },
      {
        date: "2025-11-28",
        price_close: 355,
        volatility_score: 0.2,
        realized_vol_annual: 0.21,
        ewma_vol_annual: 0.19,
        kelly_leverage: 2.3,
        fractional_kelly: 1.15,
        L_blend: 1.6,
        max_drawdown: -0.05,
      },
    ],
  },
};

const sampleValuation = {
  as_of: "2025-11-28",
  latest: {
    forward_pe: 24.2,
    forward_eps: 15.3,
    earnings_yield: 0.0413,
    earnings_yield_spread: 0.015,
    yoy_eps_growth: 0.08,
    implied_forward_pe_from_price: 23.9,
  },
  series: [
    {
      date: "2025-11-20",
      forward_pe: 25.0,
      forward_eps: 15.0,
      earnings_yield: 0.04,
      earnings_yield_spread: 0.012,
      implied_forward_pe_from_price: 24.5,
      price_close: 360,
    },
    {
      date: "2025-11-24",
      forward_pe: 24.6,
      forward_eps: 15.1,
      earnings_yield: 0.0407,
      earnings_yield_spread: 0.013,
      implied_forward_pe_from_price: 24.3,
      price_close: 362,
    },
    {
      date: "2025-11-28",
      forward_pe: 24.2,
      forward_eps: 15.3,
      earnings_yield: 0.0413,
      earnings_yield_spread: 0.015,
      implied_forward_pe_from_price: 23.9,
      price_close: 365,
    },
  ],
};

test("dashboard renders leverage and valuation charts with titles and axes", async ({ page }) => {
  await page.route("**/data/metrics.json", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleMetrics) });
  });
  await page.route("**/data/valuation.json", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleValuation) });
  });

  await page.goto("http://localhost:4173/");

  // Range buttons exist
  await expect(page.getByRole("button", { name: "90日" })).toBeVisible();

  // Core chart titles
  for (const title of ["価格推移", "ボラティリティ", "最大ドローダウン", "レバレッジ推奨"]) {
    await expect(page.getByText(title)).toBeVisible();
  }

  // Valuation chart titles
  await expect(page.locator('text="Forward P/E"').first()).toBeVisible();
  await expect(page.locator('text="Forward EPS"').first()).toBeVisible();
  await expect(page.locator('text="イールドスプレッド"').first()).toBeVisible();

  // Axis labels
  await expect(page.getByText("価格(USD, 対数)")).toBeVisible();
  await expect(page.getByText("年率ボラ(σ)")).toBeVisible();
  await expect(page.getByText("最大DD(%)")).toBeVisible();
  await expect(page.getByText("レバレッジ(x)")).toBeVisible();
  await expect(page.getByText("Earn. Yield - Rf")).toBeVisible();

  // Tooltip sanity: hover on leverage chart
  const leverageChart = page.getByText("レバレッジ推奨");
  await leverageChart.hover();
});
