// ============================================================
// LAB TEMPa 400+ UJIAN — bedah "kenapa akurasi makin lama makin berkurang"
// Perintah pemilik (2026-10-15): tempa lagi, cari akar akurasi menurun.
//
// METODOLOGI (bebas kebocoran, data Binance riil):
//   • Replay ~47 hari (29 Agu → 14 Okt 2026) — hari-D diputuskan HANYA
//     dengan candle sebelum D (faktor, universe, regime, radar 4 jam).
//   • Memori berjenjang direplikasi PER VARIAN, dipanen berurutan.
//   • 10 varian tempaan × ~47 hari ≈ 1.400 vonis soal (jauh di atas 400).
//   • Split validasi: era AWAL (30 hari) vs era AKHIR (17 hari) —
//     varian pemenang harus TAJAM DI AKHIR, bukan sekadar nostalgia lama.
//   • Sanity: V0 dibandingkan pick nyata di DB.
// ============================================================
import { PrismaClient } from "@prisma/client";
import {
  getUniverse, getKlinesBulk, getKlines4hBulk, mom4hFrom,
  dynamicUniverse, candlesBefore, candleForDay, dayOpenTs, dayOfTs,
  getRegime, corr,
  type Candle, type RegimeInfo,
} from "../src/lib/cyborg/market";
import { computeFactors, rankNormalize, coarseBucket, type CoinFactors, type FactorId } from "../src/lib/cyborg/factors";
import { decidePredator, type GenomeV2, type Weights, type MemoryLookup, type MemEdge } from "../src/lib/cyborg/brain";

const db = new PrismaClient();
const UNIVERSE_SIZE = 40;

interface CtxLab {
  day: string; regime: RegimeInfo; factors: CoinFactors[];
  norm: Map<string, Record<FactorId, number>>; closes: Map<string, number[]>; m4h: Map<string, number>;
}

// ---------- varian ----------
interface Varian {
  id: string; desc: string;
  praFilter?: (f: CoinFactors, regime: RegimeInfo) => string | null; // kembalikan alasan tolak
  penaltiAntrian?: (f: CoinFactors) => number; // mom7 efektif utk urutan
  min3: boolean; // pengisi slot sampai >= 3
}

const VARIIAN: Varian[] = [
  { id: "V0-BASE", desc: "otak saat ini (baseline kesetiaan)", min3: false },
  { id: "V1-MIN3", desc: "minimum 3 koin mutlak (pengisi slot)", min3: true },
  { id: "V2-MIN3+PUNCAK", desc: "tolak menempel puncak tanpa volume (distHigh>-4 & volSurge<1.3)", min3: true, praFilter: (f) => (f.distHigh > -4 && f.volSurge < 1.3 ? "menempel puncak tanpa volume" : null) },
  { id: "V3-MIN3+AKAR", desc: "tolak pump tanpa akar (mom7>8 & mom30<2)", min3: true, praFilter: (f) => (f.mom7 > 8 && f.mom30 < 2 ? "pump tanpa akar mom30" : null) },
  { id: "V4-MIN3+RSI", desc: "tolak RSI jenuh tanpa tren (rsi>78 & emaAlign!=1)", min3: true, praFilter: (f) => (f.rsi > 78 && f.emaAlign !== 1 ? "RSI jenuh tanpa tren" : null) },
  { id: "V5-MIN3+TRIPLE", desc: "gabungan PUNCAK+AKAR+RSI", min3: true, praFilter: (f) => {
      if (f.distHigh > -4 && f.volSurge < 1.3) return "menempel puncak tanpa volume";
      if (f.mom7 > 8 && f.mom30 < 2) return "pump tanpa akar mom30";
      if (f.rsi > 78 && f.emaAlign !== 1) return "RSI jenuh tanpa tren";
      return null; } },
  { id: "V5a-LOOSE", desc: "TRIPLE ambang longgar", min3: true, praFilter: (f) => {
      if (f.distHigh > -2.5 && f.volSurge < 1.15) return "menempel puncak";
      if (f.mom7 > 12 && f.mom30 < 0) return "pump tanpa akar";
      if (f.rsi > 82 && f.emaAlign !== 1) return "RSI jenuh";
      return null; } },
  { id: "V5b-STRICT", desc: "TRIPLE ambang ketat", min3: true, praFilter: (f) => {
      if (f.distHigh > -6 && f.volSurge < 1.3) return "menempel puncak";
      if (f.mom7 > 6 && f.mom30 < 3) return "pump tanpa akar";
      if (f.rsi > 74 && f.emaAlign !== 1) return "RSI jenuh";
      return null; } },
  { id: "V6-TRIPLE+KASAR", desc: "TRIPLE + antrian menghukum chaser puncak", min3: true, praFilter: (f) => {
      if (f.distHigh > -4 && f.volSurge < 1.3) return "menempel puncak tanpa volume";
      if (f.mom7 > 8 && f.mom30 < 2) return "pump tanpa akar mom30";
      if (f.rsi > 78 && f.emaAlign !== 1) return "RSI jenuh tanpa tren";
      return null; }, penaltiAntrian: (f) => (f.distHigh > -5 && f.volSurge < 1.3 ? f.mom7 * 0.4 : f.mom7) },
  { id: "V7-TRIPLE+BTCGATE", desc: "TRIPLE + rezim BTC turun wajib struktur naik", min3: true, praFilter: (f, rg) => {
      if (f.distHigh > -4 && f.volSurge < 1.3) return "menempel puncak tanpa volume";
      if (f.mom7 > 8 && f.mom30 < 2) return "pump tanpa akar mom30";
      if (f.rsi > 78 && f.emaAlign !== 1) return "RSI jenuh tanpa tren";
      if ((rg.regime === "TREND_TURUN" || rg.regime === "JATUH") && !(f.mom7 >= -0.2 && f.emaAlign === 1)) return "rezim BTC turun, struktur tidak naik";
      return null; } },
];

// ---------- memori replika per varian (jenjang SIMBOL→BUCKET3→REZIM) ----------
function buatMemori(): MemoryLookup {
  const eps = new Map<string, { n: number; sum: number; hit: number }>();
  const coarse = new Map<string, { n: number; sum: number; hit: number }>();
  const rez = new Map<string, { n: number; sum: number; hit: number }>();
  const avg = (v: { n: number; sum: number }) => (v.n > 0 ? v.sum / v.n : 0);
  const hitOf = (v: { n: number; hit: number }) => (v.n > 0 ? v.hit / v.n : 0);
  const tambah = (m: Map<string, { n: number; sum: number; hit: number }>, k: string, ret: number, hit: boolean) => {
    const v = m.get(k) ?? { n: 0, sum: 0, hit: 0 };
    v.n++; v.sum += ret; v.hit += hit ? 1 : 0; m.set(k, v);
  };
  return {
    panen(regime: string, symbol: string, bucket3: string, direction: string, ret: number, hit: boolean) {
      tambah(eps, `E|${regime}|${symbol}|${direction}`, ret, hit);
      tambah(coarse, `P3|${regime}|${bucket3}|${direction}`, ret, hit);
      tambah(rez, `PR|${regime}|${direction}`, ret, hit);
    },
    edge(regimeStr: string, symbol: string, _b8: string, bucket3: string, direction: string): MemEdge {
      const e = eps.get(`E|${regimeStr}|${symbol}|${direction}`);
      if (e && e.n >= 2) return { level: "SIMBOL", n: e.n, edge: avg(e), hit: hitOf(e) };
      const c = coarse.get(`P3|${regimeStr}|${bucket3}|${direction}`);
      if (c && c.n >= 2) return { level: "BUCKET3", n: c.n, edge: avg(c), hit: hitOf(c) };
      const r = rez.get(`PR|${regimeStr}|${direction}`);
      if (r && r.n >= 4) return { level: "REZIM", n: r.n, edge: avg(r), hit: hitOf(r) };
      const best = [e, c].filter((x): x is { n: number; sum: number; hit: number } => !!x).sort((a, b) => b.n - a.n)[0];
      return best ? { level: "LEMAH", n: best.n, edge: avg(best) * 0.4, hit: hitOf(best) } : { level: "BARU", n: 0, edge: 0, hit: 0 };
    },
    size() { return { simbol: eps.size, bucket3: coarse.size, rezim: rez.size, episode: 0 }; },
  } as MemoryLookup & { panen(r: string, s: string, b3: string, d: string, ret: number, hit: boolean): void };
}

interface Vonis { day: string; symbol: string; dir: "BUY" | "SELL"; conf: number; ret: number; hit: boolean; era: "AWAL" | "AKHIR"; isi?: boolean }

async function main() {
  console.log("=== LAB TEMPa 400+ UJIAN — AKURASI MENURUN ===");
  const t0 = Date.now();

  // 1. genome & weights nyata dari DB
  const meta = await db.meta.findMany();
  let genome: GenomeV2 | null = null;
  for (const m of meta) if (m.key === "genomeV2") { try { genome = JSON.parse(m.value) as GenomeV2; } catch {} }
  const weightRows = await db.genomeState.findMany();
  const weightsPerRegime: Record<string, Weights> = {};
  for (const r of weightRows) { try { weightsPerRegime[r.regime] = JSON.parse(r.weights) as Weights; } catch {} }
  console.log("genome DB:", JSON.stringify(genome ?? "(default)"));
  console.log("weights rezim tersimpan:", Object.keys(weightsPerRegime).join(","));

  // 2. pool data
  const universe = await getUniverse();
  const everPicked = await db.pick.findMany({ select: { symbol: true }, distinct: ["symbol"] });
  const poolSet = new Set<string>(universe.slice(0, 150).map((u) => u.symbol));
  for (const p of everPicked) poolSet.add(p.symbol);
  poolSet.add("BTCUSDT");
  const symbols = [...poolSet];
  console.log(`pool ${symbols.length} simbol — tarik klines 1d + 4h (sabar, data riil)...`);
  const klines = await getKlinesBulk(symbols);
  const btcAll = klines.get("BTCUSDT") ?? [];
  if (btcAll.length < 60) throw new Error("BTC klines kurang");
  const klines4h = await getKlines4hBulk(symbols);
  console.log(`klines: 1d=${klines.size} simbol, 4h=${klines4h.size} simbol (${((Date.now()-t0)/1000).toFixed(0)} dtk)`);

  const live = btcAll[btcAll.length - 1];
  const hariIni = dayOfTs(live.openTime);
  const allDays = btcAll.filter((c) => c.openTime < live.openTime).map((c) => dayOfTs(c.openTime)).filter((d) => d >= "2026-08-29");
  console.log(`hari diadili: ${allDays.length} (${allDays[0]}..${allDays[allDays.length-1]}); hari hidup=${hariIni}`);

  const batasEraAkhir = Math.max(0, allDays.length - 17); // era AKHIR = 17 hari terakhir

  // 3. konteks per hari (sekali, dibagi semua varian — data sama persis)
  const ctxByDay = new Map<string, CtxLab>();
  for (const d of allDays) {
    const btcBefore = candlesBefore(btcAll, d);
    const uniSyms = dynamicUniverse(klines, d, UNIVERSE_SIZE);
    const factors: CoinFactors[] = []; const closes = new Map<string, number[]>(); const m4h = new Map<string, number>();
    const cutoff = dayOpenTs(d);
    for (const sym of uniSyms) {
      const before = candlesBefore(klines.get(sym) ?? [], d);
      if (before.length < 35) continue;
      const f = computeFactors(sym, before, btcBefore);
      if (f) { factors.push(f); closes.set(sym, before.map((c) => c.close)); m4h.set(sym, mom4hFrom(klines4h.get(sym), cutoff)); }
    }
    if (factors.length < 10) continue;
    const regime = await getRegime(btcBefore, closes);
    ctxByDay.set(d, { day: d, regime, factors, norm: rankNormalize(factors), closes, m4h });
  }
  console.log(`konteks terbentuk: ${ctxByDay.size}/${allDays.length} hari`);

  // 4. replay per varian
  const hasil = new Map<string, { vonis: Vonis[]; mem: ReturnType<typeof buatMemori> }>();
  for (const v of VARIIAN) hasil.set(v.id, { vonis: [], mem: buatMemori() });

  let soalCount = 0;
  const dayIdxList = [...ctxByDay.keys()];
  for (let di = 0; di < dayIdxList.length; di++) {
    const d = dayIdxList[di];
    const ctx = ctxByDay.get(d)!;
    const era: "AWAL" | "AKHIR" = di >= batasEraAkhir ? "AKHIR" : "AWAL";
    const W: Weights = weightsPerRegime[ctx.regime.regime] ?? { mom7: 1.4, mom30: 0.6, emaAlign: 1.0, rsi: 0.4, volSurge: 0.9, atrInv: 0.35, distHigh: 0.8, btcCorr: 0.2 };
    const G: GenomeV2 = genome ?? { kBase: 3, paraK: 60, breadthK2: 45, breadthK1: 32, atrCap: 16, corrCap: 0.95, sellOn: false, anchorOn: true, minNorm: 0.5, m4hReject: 0, memVetoOn: true };

    for (const v of VARIIAN) {
      const mem = hasil.get(v.id)!.mem;
      // pra-filter varian
      const factorsV: CoinFactors[] = [];
      const rejectLog: { symbol: string; reason: string }[] = [];
      for (const f of ctx.factors) {
        const alasan = v.praFilter?.(f, ctx.regime);
        if (alasan) rejectLog.push({ symbol: f.symbol, reason: alasan }); else factorsV.push(f);
      }
      // penalti antrian (V6): mom7 efektif hanya untuk urutan
      const factorsForBrain = v.penaltiAntrian ? factorsV.map((f) => ({ ...f, mom7: v.penaltiAntrian!(f) })) : factorsV;
      const out = decidePredator({
        factors: factorsForBrain, norm: ctx.norm, universeCloses: ctx.closes, regime: ctx.regime,
        generation: 3, genome: G, weights: W, m4h: ctx.m4h, memory: mem,
      });
      const picked = new Set(out.picks.map((p) => p.symbol));
      const picks = [...out.picks];

      // pengisi slot MIN-3: dari antrian yang lolos pra-filter (di luar yang sudah dipilih)
      if (v.min3 && picks.length < 3) {
        const urut = factorsV.filter((f) => !picked.has(f.symbol)).sort((a, b) => b.mom7 - a.mom7);
        for (const f of urut) {
          if (picks.length >= 3) break;
          if (f.atrPct > G.atrCap) continue;
          const cl = ctx.closes.get(f.symbol) ?? [];
          if (cl.length < 30) continue;
          let overlap = false;
          for (const b of picks) {
            const clp = ctx.closes.get(b.symbol) ?? [];
            if (clp.length >= 30 && Math.abs(corr(cl.slice(-30), clp.slice(-30))) > G.corrCap) { overlap = true; break; }
          }
          if (overlap) continue;
          const nrm = ctx.norm.get(f.symbol) ?? ({} as Record<FactorId, number>);
          const m4 = ctx.m4h.get(f.symbol) ?? 0;
          picks.push({
            symbol: f.symbol, direction: "BUY",
            confidence: Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6)))),
            score: 0, evidence: { factors: nrm as unknown as Record<string, number>, topReasons: ["PENGISI SLOT MIN-3"], duties: [], policy: ["Pengisi slot minimum-3 koin"], regime: ctx.regime.regime, genomeGeneration: 3 },
          });
          picked.add(f.symbol);
        }
      }

      // vonis dengan candle D
      for (const p of picks) {
        const entry = ctx.closes.get(p.symbol)?.[(-1 + (ctx.closes.get(p.symbol)?.length ?? 0))] ?? NaN;
        const exit = candleForDay(klines.get(p.symbol) ?? [], d)?.close ?? null;
        if (!Number.isFinite(entry) || exit === null) continue;
        const ret = (exit - entry) / entry;
        const hit = ret > 0;
        soalCount++;
        hasil.get(v.id)!.vonis.push({ day: d, symbol: p.symbol, dir: p.direction, conf: p.confidence, ret, hit, era });
        const b3 = coarseBucket(ctx.norm.get(p.symbol) ?? ({} as Record<FactorId, number>));
        mem.panen(ctx.regime.regime, p.symbol, b3, p.direction, ret, hit);
      }
    }
  }

  // 5. metrik & laporan
  console.log(`\nTOTAL SOAL VONIS: ${soalCount} (${VARIIAN.length} varian × ${dayIdxList.length} hari)`);
  console.log("\n=== TABEL PER VARIAN ===");
  console.log("varian                n    hit%   ret%      hitAkhir%  hitAwal%  streak0  conf65hit%  conf<65hit%  n>=3hari%");
  const ringkasan: { id: string; hitAkhir: number; total: number; ret: number; kalibrasi: number }[] = [];
  for (const v of VARIIAN) {
    const vs = hasil.get(v.id)!.vonis;
    if (vs.length === 0) continue;
    const n = vs.length, hit = vs.filter((x) => x.hit).length;
    const ret = vs.reduce((a, x) => a + x.ret, 0) * 100;
    const akhir = vs.filter((x) => x.era === "AKHIR");
    const awal = vs.filter((x) => x.era === "AWAL");
    const hitA = akhir.length ? akhir.filter((x) => x.hit).length / akhir.length * 100 : NaN;
    const hitW = awal.length ? awal.filter((x) => x.hit).length / awal.length * 100 : NaN;
    // streak hari tanpa hit
    const perDay = new Map<string, boolean>();
    for (const x of vs) perDay.set(x.day, (perDay.get(x.day) ?? false) || x.hit);
    const days = [...perDay.keys()].sort();
    let streak = 0, maxStreak = 0;
    for (const dd of days) { if (perDay.get(dd)) streak = 0; else { streak++; maxStreak = Math.max(maxStreak, streak); } }
    const c65 = vs.filter((x) => x.conf >= 65), cL = vs.filter((x) => x.conf < 65);
    const h65 = c65.length ? c65.filter((x) => x.hit).length / c65.length * 100 : NaN;
    const hL = cL.length ? cL.filter((x) => x.hit).length / cL.length * 100 : NaN;
    // kepatuhan min3
    const cntPerDay = new Map<string, number>();
    for (const x of vs) cntPerDay.set(x.day, (cntPerDay.get(x.day) ?? 0) + 1);
    const min3ok = [...cntPerDay.values()].filter((n2) => n2 >= 3).length / cntPerDay.size * 100;
    console.log(`${v.id.padEnd(20)} ${String(n).padStart(4)} ${(hit/n*100).toFixed(1).padStart(5)} ${ret.toFixed(1).padStart(8)} ${hitA.toFixed(1).padStart(9)} ${hitW.toFixed(1).padStart(9)} ${String(maxStreak).padStart(7)} ${h65.toFixed(1).padStart(10)} ${hL.toFixed(1).padStart(11)} ${min3ok.toFixed(0).padStart(9)}`);
    ringkasan.push({ id: v.id, hitAkhir: hitA, total: hit / n, ret, kalibrasi: (h65 ?? 0) - (hL ?? 100) });
  }

  // 6. sanity V0 vs DB nyata (3 hari sampel)
  console.log("\n=== SANITY V0 vs DB NYATA ===");
  const v0 = hasil.get("V0-BASE")!.vonis;
  for (const dd of ["2026-09-20", "2026-10-09", "2026-10-10"]) {
    const lab = v0.filter((x) => x.day === dd).map((x) => x.symbol.replace("USDT", "")).sort().join(",");
    const rows = await db.pick.findMany({ where: { competitor: "MICAPROFITA", battleDay: { day: dd } }, select: { symbol: true } });
    console.log(`${dd}: lab=[${lab}] db=[${rows.map((r) => r.symbol.replace("USDT", "")).sort().join(",")}]`);
  }

  // 7. bedah hari 11-14 (yang pengguna laporkan kalah beruntun) — vonis varian terbaik nanti dipakai
  console.log("\n=== VONIS HARI 11-14 (V0-BASE, hari yang 'mentok') ===");
  for (const x of v0.filter((x) => x.day >= "2026-10-11")) console.log(`${x.day} ${x.symbol.replace("USDT","")} ${x.dir} conf=${x.conf} ret=${(x.ret*100).toFixed(1)}% ${x.hit ? "MENANG" : "KALAH"}`);

  console.log(`\nselesai ${((Date.now()-t0)/1000).toFixed(0)} dtk`);
  // simpan hasil mentah untuk langkah tempa
  const dump = VARIIAN.map((v) => ({ id: v.id, desc: v.desc, vonis: hasil.get(v.id)!.vonis }));
  (globalThis as unknown as { __LAB_DUMP__?: unknown }).__LAB_DUMP__ = dump;
  const { writeFileSync } = await import("node:fs");
  writeFileSync("/home/z/my-project/scripts/lab400_hasil.json", JSON.stringify(dump));
  console.log("hasil lengkap → scripts/lab400_hasil.json");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
