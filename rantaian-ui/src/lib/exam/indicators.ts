// ============================================================
// INDIKATOR TA MURNI — deterministik, tanpa dependensi.
// Semua array selalu sepanjang input; nilai awal diisi aman.
// ============================================================

import type { Candle } from './generator'

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

export function mean(vals: number[]): number {
  if (!vals.length) return 0
  let s = 0
  for (const v of vals) s += v
  return s / vals.length
}

export function stdev(vals: number[]): number {
  if (vals.length < 2) return 0
  const m = mean(vals)
  let s = 0
  for (const v of vals) s += (v - m) * (v - m)
  return Math.sqrt(s / (vals.length - 1))
}

export function ema(vals: number[], period: number): number[] {
  const out = new Array<number>(vals.length).fill(0)
  if (!vals.length) return out
  const k = 2 / (period + 1)
  let prev = vals[0]
  out[0] = prev
  for (let i = 1; i < vals.length; i++) {
    prev = vals[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

export function roc(closes: number[], period: number): number[] {
  const out = new Array<number>(closes.length).fill(0)
  for (let i = period; i < closes.length; i++) {
    const base = closes[i - period]
    out[i] = base !== 0 ? closes[i] / base - 1 : 0
  }
  return out
}

/** RSI Wilder */
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(50)
  if (closes.length <= period) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  gain /= period
  loss /= period
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gain = (gain * (period - 1) + Math.max(d, 0)) / period
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
  }
  return out
}

export interface MacdOut {
  line: number[]
  signal: number[]
  hist: number[]
}

export function macd(closes: number[], fast = 12, slow = 26, sig = 9): MacdOut {
  const ef = ema(closes, fast)
  const es = ema(closes, slow)
  const line = closes.map((_, i) => ef[i] - es[i])
  const signal = ema(line, sig)
  const hist = line.map((v, i) => v - signal[i])
  return { line, signal, hist }
}

export function trueRange(candles: Candle[]): number[] {
  const out = new Array<number>(candles.length).fill(0)
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    if (i === 0) {
      out[i] = c.h - c.l
      continue
    }
    const pc = candles[i - 1].c
    out[i] = Math.max(c.h - c.l, Math.abs(c.h - pc), Math.abs(c.l - pc))
  }
  return out
}

/** ATR Wilder */
export function atr(candles: Candle[], period = 14): number[] {
  const tr = trueRange(candles)
  const out = new Array<number>(candles.length).fill(0)
  if (candles.length === 0) return out
  let acc = 0
  let count = 0
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      acc += tr[i]
      count++
      out[i] = acc / count
    } else {
      out[i] = (out[i - 1] * (period - 1) + tr[i]) / period
    }
  }
  return out
}

export interface BollOut {
  mid: number[]
  upper: number[]
  lower: number[]
  pctB: number[]
  bw: number[]
}

export function bollinger(closes: number[], period = 20, mult = 2): BollOut {
  const n = closes.length
  const mid = new Array<number>(n).fill(0)
  const upper = new Array<number>(n).fill(0)
  const lower = new Array<number>(n).fill(0)
  const pctB = new Array<number>(n).fill(0.5)
  const bw = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - period + 1)
    const win = closes.slice(lo, i + 1)
    const m = mean(win)
    const sd = stdev(win)
    mid[i] = m
    upper[i] = m + mult * sd
    lower[i] = m - mult * sd
    const denom = upper[i] - lower[i]
    pctB[i] = denom > 1e-12 ? (closes[i] - lower[i]) / denom : 0.5
    bw[i] = m !== 0 ? denom / m : 0
  }
  return { mid, upper, lower, pctB, bw }
}

export function obv(candles: Candle[]): number[] {
  const out = new Array<number>(candles.length).fill(0)
  let acc = 0
  for (let i = 0; i < candles.length; i++) {
    if (i > 0) {
      if (candles[i].c > candles[i - 1].c) acc += candles[i].v
      else if (candles[i].c < candles[i - 1].c) acc -= candles[i].v
    }
    out[i] = acc
  }
  return out
}

/** ADX Wilder sederhana */
export function adx(candles: Candle[], period = 14): number[] {
  const n = candles.length
  const out = new Array<number>(n).fill(0)
  if (n < period * 2) return out
  const tr = trueRange(candles)
  const plusDM = new Array<number>(n).fill(0)
  const minusDM = new Array<number>(n).fill(0)
  for (let i = 1; i < n; i++) {
    const up = candles[i].h - candles[i - 1].h
    const dn = candles[i - 1].l - candles[i].l
    plusDM[i] = up > dn && up > 0 ? up : 0
    minusDM[i] = dn > up && dn > 0 ? dn : 0
  }
  const rma = (src: number[]): number[] => {
    const o = new Array<number>(src.length).fill(0)
    let acc = 0
    for (let i = 1; i <= period; i++) acc += src[i]
    o[period] = acc
    for (let i = period + 1; i < src.length; i++) {
      o[i] = o[i - 1] - o[i - 1] / period + src[i]
    }
    return o
  }
  const trS = rma(tr)
  const pS = rma(plusDM)
  const mS = rma(minusDM)
  const dx = new Array<number>(n).fill(0)
  for (let i = period; i < n; i++) {
    const p = trS[i] > 0 ? (100 * pS[i]) / trS[i] : 0
    const m = trS[i] > 0 ? (100 * mS[i]) / trS[i] : 0
    const denom = p + m
    dx[i] = denom > 1e-12 ? (100 * Math.abs(p - m)) / denom : 0
  }
  let adxAcc = 0
  let cnt = 0
  for (let i = period; i < Math.min(n, period * 2); i++) {
    adxAcc += dx[i]
    cnt++
  }
  out[Math.min(n, period * 2) - 1] = cnt ? adxAcc / cnt : 0
  for (let i = period * 2; i < n; i++) {
    out[i] = (out[i - 1] * (period - 1) + dx[i]) / period
  }
  return out
}

/** regresi linear terhadap indeks: slope per-step & R² */
export function linreg(vals: number[]): { slope: number; r2: number } {
  const n = vals.length
  if (n < 2) return { slope: 0, r2: 0 }
  const xm = (n - 1) / 2
  const ym = mean(vals)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (i - xm) * (vals[i] - ym)
    sxx += (i - xm) * (i - xm)
    syy += (vals[i] - ym) * (vals[i] - ym)
  }
  const slope = sxx > 0 ? sxy / sxx : 0
  const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0
  return { slope, r2 }
}

/** persentil nilai x dalam sampel (0..1) */
export function percentileRank(sample: number[], x: number): number {
  if (!sample.length) return 0.5
  let below = 0
  for (const v of sample) if (v < x) below++
  return below / sample.length
}

export interface Swings {
  highs: number[]
  lows: number[]
}

/** deteksi swing point lokal dengan jendela k */
export function findSwings(closes: number[], k = 5): Swings {
  const highs: number[] = []
  const lows: number[] = []
  for (let i = k; i < closes.length - k; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue
      if (closes[j] >= closes[i]) isHigh = false
      if (closes[j] <= closes[i]) isLow = false
    }
    if (isHigh) highs.push(closes[i])
    if (isLow) lows.push(closes[i])
  }
  return { highs, lows }
}

/** skor struktur magnitude-aware: butuh perbedaan swing > noise ATR */
export function structureScore(sw: Swings, atrVal: number): number {
  const h = sw.highs
  const l = sw.lows
  if (h.length < 2 || l.length < 2) return 0
  const a = Math.max(atrVal, 1e-9)
  const dh = (h[h.length - 1] - h[h.length - 2]) / a
  const dl = (l[l.length - 1] - l[l.length - 2]) / a
  return clamp(0.55 * clamp(dh / 2, -1, 1) + 0.45 * clamp(dl / 2, -1, 1), -1, 1)
}
