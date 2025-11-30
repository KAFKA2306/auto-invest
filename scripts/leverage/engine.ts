import {
  mean,
  std,
  covariance,
  correlation,
  quantile,
  cumprod,
  cummax,
} from "../shared/math";
import type { LeverageSeriesItem } from "./types";

export const computeLeverage = (
  prices: number[],
  dates: string[],
  ffrateDaily: number[],
  spxPrices: number[] | null,
  params: {
    windowTradingDays: number;
    riskFreeRateAnnual: number;
    borrowSpreadAnnual: number;
    fundFeeAnnual: number;
    cap: number;
    fraction: number;
    tradingDaysPerYear?: number;
    volEwmaLambda?: number;
    volTargetAnnual?: number;
    blendAlpha?: number;
  }
) => {
  const {
    windowTradingDays,
    riskFreeRateAnnual,
    fundFeeAnnual,
    cap,
    fraction,
    tradingDaysPerYear = 252,
    volEwmaLambda = 0.94,
    volTargetAnnual = 0.2,
    blendAlpha = 0.5,
  } = params;

  // Calculate log returns
  const logReturns: number[] = [];
  const spxLogReturns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
    if (spxPrices) {
      spxLogReturns.push(Math.log(spxPrices[i] / spxPrices[i - 1]));
    }
  }

  // Align arrays (drop first element of dates/prices/ffrate to match returns)
  const alignedDates = dates.slice(1);
  const alignedPrices = prices.slice(1);
  const alignedFfrate = ffrateDaily.slice(1);

  // Global stats
  const muDaily = mean(logReturns);
  const sigmaDaily = std(logReturns);
  const muAnnual = muDaily * tradingDaysPerYear;
  const sigmaAnnual = sigmaDaily * Math.sqrt(tradingDaysPerYear);
  const varianceAnnual = Math.pow(sigmaAnnual, 2);

  const muExcessAnnual = muAnnual - riskFreeRateAnnual - fundFeeAnnual;
  const sharpeRatioAnnual = sigmaAnnual > 0 ? muExcessAnnual / sigmaAnnual : 0;

  // Downside deviation
  const downsideReturns = logReturns.filter((r) => r < 0);
  const downsideDeviationDaily =
    downsideReturns.length > 0
      ? Math.sqrt(mean(downsideReturns.map((r) => Math.pow(r, 2))))
      : 0;
  const downsideDeviationAnnual =
    downsideDeviationDaily * Math.sqrt(tradingDaysPerYear);
  const sortinoRatioAnnual =
    downsideDeviationAnnual > 0 ? muExcessAnnual / downsideDeviationAnnual : 0;

  // Drawdown
  const cumulativeReturns = cumprod(logReturns.map((r) => 1 + r));
  const peak = cummax(cumulativeReturns);
  const drawdowns = cumulativeReturns.map((c, i) => (c - peak[i]) / peak[i]);
  const maxDrawdown = Math.min(...drawdowns);
  const calmarRatio = maxDrawdown !== 0 ? muAnnual / Math.abs(maxDrawdown) : 0;

  // VaR / ES
  const var95 = quantile(logReturns, 0.05);
  const tailReturns = logReturns.filter((r) => r <= var95);
  const es95Daily = mean(tailReturns);

  // Vol of Vol
  const rollingVolWindow = 21;
  const rollingVols: number[] = [];
  for (let i = 0; i <= logReturns.length - rollingVolWindow; i++) {
    const slice = logReturns.slice(i, i + rollingVolWindow);
    rollingVols.push(std(slice) * Math.sqrt(tradingDaysPerYear));
  }
  const volOfVol = std(rollingVols);

  // Beta / Corr
  let betaSpx = 0;
  let corrSpx = 0;
  if (spxLogReturns.length === logReturns.length) {
    const cov = covariance(logReturns, spxLogReturns);
    const varSpx = Math.pow(std(spxLogReturns), 2);
    betaSpx = varSpx > 0 ? cov / varSpx : 0;
    corrSpx = correlation(logReturns, spxLogReturns);
  }

  // Kelly
  const kellyLeverage = varianceAnnual > 0 ? muExcessAnnual / varianceAnnual : 0;
  const fractionalKelly = Math.min(cap, fraction * kellyLeverage);

  // Series calculation
  const seriesData: LeverageSeriesItem[] = [];
  let ewmaVar = 0;

  for (let i = 0; i < logReturns.length; i++) {
    const ret = logReturns[i];
    
    // EWMA Vol
    if (i === 0) {
      ewmaVar = Math.pow(ret, 2);
    } else {
      ewmaVar = volEwmaLambda * ewmaVar + (1 - volEwmaLambda) * Math.pow(ret, 2);
    }
    const ewmaVolAnnual = Math.sqrt(ewmaVar * tradingDaysPerYear);

    // Window stats
    const windowStart = Math.max(0, i - windowTradingDays + 1);
    const windowSlice = logReturns.slice(windowStart, i + 1);
    
    // Realized Vol
    const realizedVolAnnual = windowSlice.length > 1 
      ? std(windowSlice) * Math.sqrt(tradingDaysPerYear) 
      : 0;
    
    const volatilityScore = 0.5 * realizedVolAnnual + 0.5 * ewmaVolAnnual;

    const windowMuDaily = mean(windowSlice);
    const windowSigmaDaily = std(windowSlice);
    const windowVarianceAnnual = Math.pow(windowSigmaDaily * Math.sqrt(tradingDaysPerYear), 2);
    
    const windowMuExcessAnnual = (windowMuDaily * tradingDaysPerYear) - riskFreeRateAnnual - fundFeeAnnual;
    const windowKelly = windowVarianceAnnual > 0 ? windowMuExcessAnnual / windowVarianceAnnual : 0;

    const windowLVol = volatilityScore > 0 ? volTargetAnnual / volatilityScore : 0;
    const windowLBlend = Math.min(cap, blendAlpha * windowKelly + (1 - blendAlpha) * windowLVol);

    // Window Drawdown
    const windowCum = cumprod(windowSlice.map(r => 1 + r));
    const windowPeak = cummax(windowCum);
    const windowDd = (windowCum[windowCum.length - 1] - windowPeak[windowPeak.length - 1]) / windowPeak[windowPeak.length - 1];

    // Window Beta/Corr
    let wBeta = 0;
    let wCorr = 0;
    if (spxLogReturns.length > 0) {
        const spxWindowSlice = spxLogReturns.slice(windowStart, i + 1);
        if (spxWindowSlice.length === windowSlice.length && windowSlice.length > 1) {
             const wCov = covariance(windowSlice, spxWindowSlice);
             const wVarSpx = Math.pow(std(spxWindowSlice), 2);
             wBeta = wVarSpx > 0 ? wCov / wVarSpx : 0;
             wCorr = correlation(windowSlice, spxWindowSlice);
        }
    }

    seriesData.push({
      date: alignedDates[i],
      price_close: alignedPrices[i],
      ffrate_daily: alignedFfrate[i],
      realized_vol_annual: realizedVolAnnual,
      ewma_vol_annual: ewmaVolAnnual,
      volatility_score: volatilityScore,
      mu_excess_annual: windowMuExcessAnnual,
      kelly_leverage: windowKelly,
      fractional_kelly: Math.min(cap, fraction * windowKelly),
      L_kelly: windowKelly,
      L_vol: windowLVol,
      L_blend: windowLBlend,
      max_drawdown: windowDd,
      beta_spx: wBeta,
      corr_spx: wCorr,
    });
  }

  return {
    as_of: alignedDates[alignedDates.length - 1],
    symbol: "QQQ",
    window_trading_days: windowTradingDays,
    trading_days_per_year: tradingDaysPerYear,
    risk_free_rate_annual: riskFreeRateAnnual,
    borrow_spread_annual: params.borrowSpreadAnnual,
    fund_fee_annual: fundFeeAnnual,
    mu_excess_annual: muExcessAnnual,
    volatility_annual: sigmaAnnual,
    sharpe_ratio_annual: sharpeRatioAnnual,
    kelly_leverage: kellyLeverage,
    fractional_kelly: fractionalKelly,
    cap: cap,
    suggested: {
      alpha: blendAlpha,
      vol_target_annual: volTargetAnnual,
      cap: cap,
      L_kelly: kellyLeverage,
      L_vol: volTargetAnnual / sigmaAnnual, // Approximation based on global sigma
      L_blend: Math.min(cap, blendAlpha * kellyLeverage + (1 - blendAlpha) * (volTargetAnnual / sigmaAnnual)),
    },
    risk: {
      downside_deviation_annual: downsideDeviationAnnual,
      sortino_ratio_annual: sortinoRatioAnnual,
      max_drawdown: maxDrawdown,
      calmar_ratio: calmarRatio,
      es_95: es95Daily,
      vol_of_vol: volOfVol,
      beta_spx: betaSpx,
      corr_spx: corrSpx,
    },
    series: seriesData,
  };
};
