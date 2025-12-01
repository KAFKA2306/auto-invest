import { test, expect } from "@playwright/test";

const sampleBottomUpData = {
  as_of: "2025-12-01",
  prior_period: {
    date: "2025-09-30",
    label: "2025Q3",
    eps: 100.0,
  },
  base_period: {
    date: "2024-12-31",
    label: "2024Q4",
    eps: 90.0,
  },
  components: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      quarter: "2025Q3",
      eps: 2.0,
      eps_yoy: 0.1,
      weight: 0.5,
      source: "yfinance",
      history: [],
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      quarter: "2025Q3",
      eps: 3.0,
      eps_yoy: 0.15,
      weight: 0.5,
      source: "yfinance",
      history: [],
    },
  ],
};

test.describe("BottomUp Page", () => {
  test("renders bottom-up table with valid data", async ({ page }) => {
    await page.route("**/data/bottom_up_eps.json*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sampleBottomUpData),
      });
    });

    await page.route("**/data/valuation.json*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.goto("http://localhost:4173/bottom-up");

    // Check for main headers
    await expect(page.getByText("NASDAQ-100 Bottom-up EPS")).toBeVisible();
    await expect(page.getByText("2025-12-01")).toBeVisible();

    // Check table content
    await expect(page.getByText("Apple Inc.")).toBeVisible();
    await expect(page.getByText("Microsoft Corp.")).toBeVisible();
    
    // Check aggregated metrics (calculated fields)
    // Weighted growth: 0.5*0.1 + 0.5*0.15 = 0.125 => 12.5%
    await expect(page.getByText("12.5%")).toBeVisible();
  });

  test("shows error message when schema validation fails", async ({ page }) => {
    const invalidData = {
      // Missing required fields like as_of, prior_period
      components: [],
    };

    await page.route("**/data/bottom_up_eps.json*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(invalidData),
      });
    });

    await page.goto("http://localhost:4173/bottom-up");

    await expect(page.getByText("データを読み込めませんでした。")).toBeVisible();
    await expect(page.getByText("Schema validation failed")).toBeVisible();
  });

  test("shows error message on network failure", async ({ page }) => {
    await page.route("**/data/bottom_up_eps.json*", (route) => {
      route.abort();
    });

    await page.goto("http://localhost:4173/bottom-up");

    await expect(page.getByText("データを読み込めませんでした。")).toBeVisible();
    // The exact error message depends on the browser/network stack, but it should be visible
  });
});
