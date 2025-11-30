export const mean = (d: number[]) => d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
export const std = (d: number[]) => {
  if (d.length < 2) return 0;
  const m = mean(d);
  return Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / (d.length - 1));
};
export const median = (d: number[]) => {
  if (!d.length) return 0;
  const s = [...d].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const rolling = (d: number[], w: number, fn: (s: number[]) => number, min = w) =>
  d.map((_, i) => (i - w + 1 >= 0 && i + 1 >= min ? fn(d.slice(Math.max(0, i - w + 1), i + 1)) : null));
export const expanding = (d: number[], fn: (s: number[]) => number, min = 1) =>
  d.map((_, i) => (i + 1 >= min ? fn(d.slice(0, i + 1)) : null));
export const diff = (d: number[], p = 1) => d.map((v, i) => (i < p ? null : v - d[i - p]));
export const pctChange = (d: number[], p = 1) => d.map((v, i) => (i < p || d[i - p] === 0 ? null : (v - d[i - p]) / d[i - p]));
export const cumprod = (d: number[]) => {
  let acc = 1; return d.map(v => acc *= v);
};
export const cummax = (d: number[]) => {
  let m = -Infinity; return d.map(v => m = Math.max(m, v));
};
export const covariance = (x: number[], y: number[]) => {
  if (x.length !== y.length || x.length < 2) return 0;
  const xm = mean(x), ym = mean(y);
  return x.reduce((a, b, i) => a + (b - xm) * (y[i] - ym), 0) / (x.length - 1);
};
export const correlation = (x: number[], y: number[]) => {
  const c = covariance(x, y), sx = std(x), sy = std(y);
  return sx && sy ? c / (sx * sy) : 0;
};
export const quantile = (d: number[], q: number) => {
  const s = [...d].sort((a, b) => a - b), p = (s.length - 1) * q, b = Math.floor(p);
  return s[b + 1] !== undefined ? s[b] + (p - b) * (s[b + 1] - s[b]) : s[b];
};
