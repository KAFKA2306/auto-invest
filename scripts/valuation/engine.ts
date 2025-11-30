import {
  mean,
  std,
  median,
  rolling,
  expanding,
} from "../shared/math";
import type { ValuationRow } from "./types";

const TRADING_DAYS_PER_YEAR = 252;
const ROLLING_WINDOW = 20;
const PE_CLIP: [number, number] = [2.0, 60.0];
const EY_CLIP: [number, number] = [0.005, 0.12];
const ERP_BASE = 0.01;
const ERP_MOMENTUM_WEIGHT = 0.2;
const ANCHOR_WEIGHT = 0.15;
const ANCHOR_WINDOW = 30;
const REF_PE = 32.5;
const CALIB_WINDOW = 20;

const clip = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const computeValuation = (
  dates: string[],
  prices: number[],
  rfAnnual: number[],
  gdpGrowth: number[],
  forwardEps: number[],
  yoyEpsGrowth: number[]
): ValuationRow[] => {
  const rows: ValuationRow[] = [];

  // Calculate log returns
  const logReturns: (number | null)[] = [null]; // First element null
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
  }

  // Rolling stats
  const mu = rolling(
    logReturns.map((r) => r ?? 0), // Handle nulls by treating as 0 for rolling (simplified)
    ROLLING_WINDOW,
    (slice) => mean(slice) * TRADING_DAYS_PER_YEAR
  );
  
  const sigma = rolling(
    logReturns.map((r) => r ?? 0),
    ROLLING_WINDOW,
    (slice) => std(slice) * Math.sqrt(TRADING_DAYS_PER_YEAR)
  );

  // Model Yield Calculation
  const modelYields: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    const muVal = mu[i] ?? 0;
    const rf = rfAnnual[i];
    const muExcess = muVal - rf;
    
    const erpMomentum = clip(muExcess, 0, 0.10) * ERP_MOMENTUM_WEIGHT;
    const expectedReturn = rf + ERP_BASE + erpMomentum;
    const growthTerm = clip(gdpGrowth[i], -0.02, 0.05);
    let my = clip(expectedReturn - growthTerm, EY_CLIP[0], EY_CLIP[1]);
    modelYields.push(my);
  }

  // Calibration
  const medianWindow = rolling(modelYields, CALIB_WINDOW, (slice) => median(slice));
  const calibratedModelYields: number[] = [];
  
  for(let i=0; i<modelYields.length; i++) {
      let my = modelYields[i];
      const mw = medianWindow[i];
      if (mw && mw !== 0) {
          const bias = (1.0 / REF_PE) / mw;
          my = clip(my * bias, EY_CLIP[0], EY_CLIP[1]);
      }
      calibratedModelYields.push(my);
  }

  // Anchor
  const rollingAnchor = rolling(calibratedModelYields, ANCHOR_WINDOW, (slice) => median(slice));
  const expandingAnchor = expanding(calibratedModelYields, (slice) => median(slice), 30);
  
  const earningsYields: number[] = [];
  
  for(let i=0; i<calibratedModelYields.length; i++) {
      let anchor = rollingAnchor[i];
      if (anchor === null) anchor = expandingAnchor[i];
      if (anchor === null) anchor = calibratedModelYields[i];
      
      const ey = clip(ANCHOR_WEIGHT * anchor! + (1 - ANCHOR_WEIGHT) * calibratedModelYields[i], EY_CLIP[0], EY_CLIP[1]);
      earningsYields.push(ey);
  }

  // Assemble Rows
  for (let i = 0; i < prices.length; i++) {
    // Skip initial periods where we might have nulls if strict, 
    // but for now we push everything and let the consumer filter nulls if needed.
    // The Python script drops NaNs at the end.
    
    const fPe = clip(prices[i] / forwardEps[i], PE_CLIP[0], PE_CLIP[1]);
    
    rows.push({
      date: dates[i],
      price_index: prices[i],
      rf_annual: rfAnnual[i],
      gdp_growth_yoy: gdpGrowth[i],
      mu: mu[i] ?? 0,
      sigma: sigma[i] ?? 0,
      mu_excess: (mu[i] ?? 0) - rfAnnual[i],
      earnings_yield: earningsYields[i],
      earnings_yield_spread: earningsYields[i] - rfAnnual[i],
      forward_eps: forwardEps[i],
      forward_pe: fPe,
      implied_forward_pe_from_price: fPe,
      yoy_eps_growth: yoyEpsGrowth[i],
    });
  }

  return rows;
};
