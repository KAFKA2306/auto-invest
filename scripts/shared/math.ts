/**
 * Basic math and statistics helpers to replicate Pandas/Numpy functionality.
 */

export const mean = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

export const std = (data: number[]): number => {
  if (data.length < 2) return 0;
  const m = mean(data);
  const variance = data.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (data.length - 1); // Sample std (ddof=1)
  return Math.sqrt(variance);
};

export const median = (data: number[]): number => {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const rolling = (
  data: number[],
  window: number,
  fn: (slice: number[]) => number,
  minPeriods: number = window
): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    if (slice.length < minPeriods) {
      result.push(null);
    } else {
      result.push(fn(slice));
    }
  }
  return result;
};

export const expanding = (
  data: number[],
  fn: (slice: number[]) => number,
  minPeriods: number = 1
): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const slice = data.slice(0, i + 1);
    if (slice.length < minPeriods) {
      result.push(null);
    } else {
      result.push(fn(slice));
    }
  }
  return result;
};

export const diff = (data: number[], periods: number = 1): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < periods) {
      result.push(null);
    } else {
      result.push(data[i] - data[i - periods]);
    }
  }
  return result;
};

export const pctChange = (data: number[], periods: number = 1): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < periods) {
      result.push(null);
    } else {
      const prev = data[i - periods];
      if (prev === 0) {
        result.push(null); // Avoid division by zero
      } else {
        result.push((data[i] - prev) / prev);
      }
    }
  }
  return result;
};

export const cumprod = (data: number[]): number[] => {
  const result: number[] = [];
  let acc = 1;
  for (const val of data) {
    acc *= val;
    result.push(acc);
  }
  return result;
};

export const cummax = (data: number[]): number[] => {
  const result: number[] = [];
  let maxVal = -Infinity;
  for (const val of data) {
    if (val > maxVal) maxVal = val;
    result.push(maxVal);
  }
  return result;
};

export const covariance = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }
  return sum / (x.length - 1);
};

export const correlation = (x: number[], y: number[]): number => {
  const cov = covariance(x, y);
  const stdX = std(x);
  const stdY = std(y);
  if (stdX === 0 || stdY === 0) return 0;
  return cov / (stdX * stdY);
};

export const quantile = (data: number[], q: number): number => {
  const sorted = [...data].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};
