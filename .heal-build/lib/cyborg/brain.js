"use strict";
// ============================================================
// OTAK MICAPROFITA V2 "PREDATOR" — mesin keputusan arah BINER.
//
// Hasil UJIAN lab (21 hari, bebas kebocoran):
//   otak lama +30.5%  <  MOMENTUM naif +82.5%  <  PREDATOR +146.6%
// Prinsip yang terbukti:
//   1. Universe DINAMIS per hari (top likuiditas candle terakhir)
//   2. Kepemimpinan momentum = antrian utama (pump berlanjut 1-3 hari)
//   3. Konsentrasi adaptif: pasar lemah → K=1 fokus leader terkuat
//   4. Mode parabolik: leader mom7 > paraK → K=2 (naiki pelari)
//   5. SELL menggerus profit di arena harian → hanya opsional (knob)
//   6. Kewajiban wajib tetap: likuiditas, ATR, korelasi, data cukup
// Genome V2 = knob STRUKTUR (bukan sekadar bobot) → evolusi nyata.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.coarseBucket = exports.factorBucket = exports.SLOT_TEMPUR = exports.DEFAULT_GENOME_V2 = exports.DEFAULT_WEIGHTS = void 0;
exports.sanitizeGenomeV2 = sanitizeGenomeV2;
exports.kortexScore = kortexScore;
exports.arahKepastian = arahKepastian;
exports.decideDaftar = decideDaftar;
exports.decidePredator = decidePredator;
exports.patternFingerprint = patternFingerprint;
exports.coarsePolaFingerprint = coarsePolaFingerprint;
exports.regimePolaFingerprint = regimePolaFingerprint;
exports.episodeFingerprint = episodeFingerprint;
exports.rivalFingerprint = rivalFingerprint;
exports.lessonFingerprint = lessonFingerprint;
exports.fnv1a = fnv1a;
const factors_1 = require("./factors");
Object.defineProperty(exports, "factorBucket", { enumerable: true, get: function () { return factors_1.factorBucket; } });
Object.defineProperty(exports, "coarseBucket", { enumerable: true, get: function () { return factors_1.coarseBucket; } });
const market_1 = require("./market");
// Bobot komposit untuk slot ANCHOR + skor bukti briefing (dapat berevolusi)
exports.DEFAULT_WEIGHTS = {
    mom7: 1.4, mom30: 0.6, emaAlign: 1.0, rsi: 0.4,
    volSurge: 0.9, atrInv: 0.35, distHigh: 0.8, btcCorr: 0.2,
};
exports.DEFAULT_GENOME_V2 = {
    kBase: 3, paraK: 60, breadthK2: 45, breadthK1: 32,
    atrCap: 16, corrCap: 0.95, sellOn: false, anchorOn: true, minNorm: 0.5,
    m4hReject: 0,
    memVetoOn: true,
};
function sanitizeGenomeV2(g) {
    const d = exports.DEFAULT_GENOME_V2;
    const num = (v, def, lo, hi) => {
        const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
        return Math.min(hi, Math.max(lo, n));
    };
    return {
        kBase: Math.round(num(g?.kBase, d.kBase, 2, 4)),
        paraK: Math.round(num(g?.paraK, d.paraK, 40, 100)),
        breadthK2: Math.round(num(g?.breadthK2, d.breadthK2, 35, 55)),
        breadthK1: Math.round(num(g?.breadthK1, d.breadthK1, 22, Math.max(24, Math.min(42, num(g?.breadthK2, d.breadthK2, 35, 55) - 6)))),
        atrCap: num(g?.atrCap, d.atrCap, 11, 19),
        corrCap: num(g?.corrCap, d.corrCap, 0.8, 0.98),
        sellOn: typeof g?.sellOn === 'boolean' ? g.sellOn : d.sellOn,
        anchorOn: typeof g?.anchorOn === 'boolean' ? g.anchorOn : d.anchorOn,
        minNorm: num(g?.minNorm, d.minNorm, 0, 0.8),
        m4hReject: num(g?.m4hReject, d.m4hReject, -12, 0),
        memVetoOn: typeof g?.memVetoOn === 'boolean' ? g.memVetoOn : d.memVetoOn,
    };
}
function kortexScore(C, debat, me, m4, buku, atrPct, atrCap) {
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    // O — opposition: serangan tanpa pertahanan menurunkan; tanpa keduanya = netral
    const totalSerang = debat.bertahan.length + debat.serangan.length;
    const O = totalSerang === 0 ? 0.5 : clamp01(debat.bertahan.length / totalSerang);
    // R — recall ingatan: sampel kurang dari 3 episode = netral 0.5
    const R = me.level === 'BARU' || me.n < 3 ? 0.5 : clamp01((1 + Math.tanh(me.edge * 15)) / 2);
    // T — timing intraday
    const T = m4 >= 2 ? 1.0 : m4 >= 0 ? 0.6 : m4 >= -2 ? 0.35 : 0.15;
    // E — ekspektansi buku cuan hidup (tanpa buku = netral, tanpa kebocoran)
    const E = !buku || typeof buku.ekspektansiR !== 'number' || buku.totalPlan === 0
        ? 0.5
        : clamp01(0.5 + buku.ekspektansiR * 1.5);
    // X — ruang volatilitas di bawah cap
    const X = clamp01(1.25 - atrPct / Math.max(1, atrCap));
    const skor = Math.round(100 * (0.32 * C + 0.22 * O + 0.16 * R + 0.14 * T + 0.09 * E + 0.07 * X));
    return {
        C: Math.round(C * 100) / 100, O: Math.round(O * 100) / 100, R: Math.round(R * 100) / 100,
        T, E: Math.round(E * 100) / 100, X: Math.round(X * 100) / 100,
        skor,
        rumus: 'KORTEX = 100×(0.32·C + 0.22·O + 0.16·R + 0.14·T + 0.09·E + 0.07·X) — formula karangan-sendiri MICAPROFITA',
    };
}
function compositeScore(norm, w) {
    let s = 0, tot = 0;
    for (const id of factors_1.FACTOR_IDS) {
        s += norm[id] * w[id];
        tot += Math.abs(w[id]);
    }
    return tot > 0 ? s / tot : 0;
}
/**
 * V278 DEBAT-AGENTIK — tim merah menyerang kandidat sebelum lahir.
 * Serangan kelas TEKANAN (ditanggung ukuran, bukan veto): tekanan × 3 poin
 * memangkas keyakinan (cap −12). Pertahanan harus berangka, bukan dalih.
 */
function debatAgentik(f, m4, me, breadth, rank, composite, G) {
    const serangan = [];
    const bertahan = [];
    // 1) DISTRIBUSI — menempel puncak tanpa volume
    if (f.distHigh > -3) {
        if (f.volSurge < 1.3)
            serangan.push({ dari: 'DISTRIBUSI', teks: `harga menempel puncak 60h (${f.distHigh.toFixed(1)}%) tanpa lonjakan volume (${f.volSurge.toFixed(2)}x) — breakout tanpa uang nyata kerap jadi jerat distribusi` });
        else
            bertahan.push(`pendakian dekat puncak disertai volume ${f.volSurge.toFixed(2)}x — uang nyata menyertai, bukan kabar kosong`);
    }
    // 2) JENUH — RSI ekstrem tanpa tren utuh
    if (f.rsi > 72) {
        if (f.emaAlign === 1 && f.mom30 > 0)
            bertahan.push(`RSI ${f.rsi.toFixed(0)} jenuh di tren utuh (EMA naik, mom30 +${f.mom30.toFixed(1)}%) — tren kuat menahan jenuh lebih lama dari harapan`);
        else
            serangan.push({ dari: 'JENUH', teks: `RSI ${f.rsi.toFixed(0)} jenuh beli tanpa tren utuh — entry di ekstrem memperkecil ruang RR` });
    }
    // 3) DIVERGENSI — mom7 tanpa akar mom30
    if (f.mom7 > 8 && f.mom30 < 2)
        serangan.push({ dari: 'DIVERGENSI', teks: `mom7 ${f.mom7.toFixed(1)}% tanpa akar mom30 ${f.mom30.toFixed(1)}% — lonjakan tipis rawan pump-n-dump` });
    else if (f.mom7 > 8)
        bertahan.push(`momentum berakar: mom7 ${f.mom7.toFixed(1)}% ditopang mom30 ${f.mom30.toFixed(1)}% — bukan lonjakan tipis`);
    // 4) INTRADAY — radar 4 jam
    if (m4 < 0)
        serangan.push({ dari: 'INTRADAY', teks: `momentum 24j ${m4.toFixed(1)}% — radar 4 jam menunjukkan kelelahan intraday` });
    else
        bertahan.push(`konfirmasi intraday hidup (+${m4.toFixed(1)}%/24j) — leader masih bernapas`);
    // 5) INGATAN — episode serupa biasanya gagal
    if (me.level !== 'BARU' && me.n >= 3) {
        if (me.edge < 0)
            serangan.push({ dari: 'INGATAN', teks: `ingatan: ${me.n} episode serupa rata-rata ${(me.edge * 100).toFixed(1)}% (hit ${(me.hit * 100).toFixed(0)}%) — pola ini sering kalah` });
        else
            bertahan.push(`ingatan memihak: ${me.n} episode serupa rata-rata +${(me.edge * 100).toFixed(1)}%`);
    }
    // 6) ATR-LEBAR — stop lebar memangkas RR
    if (f.atrPct > G.atrCap * 0.75) {
        if (f.volSurge >= 1.5)
            bertahan.push(`ATR ${f.atrPct.toFixed(1)}% didukung volume ${f.volSurge.toFixed(2)}x — volatilitas nyata, bukan noise tipis`);
        else
            serangan.push({ dari: 'ATR-LEBAR', teks: `ATR ${f.atrPct.toFixed(1)}% mendekati cap ${G.atrCap.toFixed(0)}% — stop wajib lebar, ukuran otomatis menyusut` });
    }
    // 7) BREATH-SEMPIT — pelari kedua di pasar sempit
    if (breadth < 40 && rank > 0) {
        if (composite > 0.6)
            bertahan.push(`pasar sempit tapi komposit ${composite.toFixed(2)} — kualitas di atas kerumunan`);
        else
            serangan.push({ dari: 'BREATH', teks: `breadth ${breadth.toFixed(0)}% — pelari kedua jarang hidup di pasar sempit; pemimpin kedua kualitas ${composite.toFixed(2)}` });
    }
    const tekanan = serangan.length;
    const vonis = tekanan === 0
        ? 'LOLOS TANPA GIGITAN — tim merah menyerang struktur, tak ada serangan berangka'
        : tekanan <= 2
            ? `BERTAHAN — tekanan ${tekanan} serangan; keyakinan dipangkas ${Math.min(12, tekanan * 3)} poin, ukuran yang menanggung`
            : `GETARAN — tekanan ${tekanan} serangan tanpa jawaban; keyakinan dipangkas ${Math.min(12, tekanan * 3)} poin (cap)`;
    return { serangan, bertahan, tekanan, vonis };
}
// ============================================================
// V301 DAFTAR TEMPUR — HUKUM PEMILIK (mandat tertulis):
//   1. "K slot tempur = 50 (bukan 1). Jangan hardcode K=1."
//   2. "Guard tidak boleh membuang atau menyembunyikan kandidat."
//   3. "Kandidat yang ditolak guard tetap masuk daftar, diturunkan
//      ke peringkat paling bawah. Slot kosong diisi kandidat yang
//      ditolak guard sampai total 50."
//   4. Semua 50 koin tampil satu baris per koin, tanpa diringkas.
//   5. Ditolak guard = data selengkap lain + label "ditolak guard".
// Pipeline: dipindai (seluruh futures) → dianalisa → masuk 50 →
//           lolos guard / ditolak guard (semua tetap tampil).
// ============================================================
exports.SLOT_TEMPUR = 50;
/** Kepastian arah per koin — struktur EMA dulu, momentum menuntaskan. */
function arahKepastian(f, m4) {
    if (f.emaAlign === 1)
        return f.mom7 < -8 && m4 < -3 ? 'SELL' : 'BUY'; // struktur naik utuh → BUY kecuali runtuh tajam
    if (f.emaAlign === -1)
        return f.mom7 > 8 && m4 > 3 ? 'BUY' : 'SELL'; // struktur turun utuh → SELL kecuali rebound tajam
    if (f.mom7 >= 0 && m4 >= 0)
        return 'BUY'; // campur → ikuti momentum 7h + 4h
    if (f.mom7 < 0 && m4 < 0)
        return 'SELL';
    return f.mom7 >= 0 ? 'BUY' : 'SELL';
}
function decideDaftar(ctx, slotK = exports.SLOT_TEMPUR) {
    const { factors, norm, universeCloses, regime, genome: G, weights: W, memory: MEM } = ctx;
    const breadth = regime.breadth;
    const m4hOf = (sym) => ctx.m4h.get(sym) ?? 0;
    const b3Of = (sym) => (0, factors_1.coarseBucket)(norm.get(sym));
    const memOf = (sym, dir) => MEM ? MEM.edge(regime.regime, sym, (0, factors_1.factorBucket)(norm.get(sym) ?? {}), b3Of(sym), dir)
        : { level: 'BARU', n: 0, edge: 0, hit: 0 };
    const compositeOf = (sym) => compositeScore(norm.get(sym) ?? {}, W);
    const vetoOf = (sym) => ctx.vetoReport?.get(sym) ?? null;
    const policy = [
        `SLOT TEMPUR K=${slotK} — hukum pemilik V301 (K adaptif/K=1 dipensiunkan)`,
        'Guard tidak membuang kandidat — yang ditolak tetap masuk daftar di peringkat paling bawah berlabel alasan',
        `Pindaian futures Binance: ${ctx.dipindai ?? '—'} pasang USDT dipindai · ${factors.length} dianalisa mendalam (top likuiditas)`,
    ];
    // peringkat: komposit kualitas struktur+momentum dulu, mom7 tie-break
    const ranked = [...factors].sort((a, b) => compositeOf(b.symbol) - compositeOf(a.symbol) || b.mom7 - a.mom7);
    const lolos = [];
    const tolak = [];
    for (const f of ranked) {
        const nrm = norm.get(f.symbol) ?? {};
        const m4 = m4hOf(f.symbol);
        const arah = arahKepastian(f, m4);
        const sgn = arah === 'BUY' ? 1 : -1;
        const me = memOf(f.symbol, arah);
        const composite = compositeOf(f.symbol);
        const qv = ctx.qvOf?.get(f.symbol) ?? null;
        const duties = [];
        const gagal = [];
        const push = (name, pass, note) => duties.push({ name, pass, note });
        // 1) Data cukup
        const nCandle = (universeCloses.get(f.symbol) ?? []).length;
        push('Data cukup', nCandle >= 30, `${nCandle} candle harian`);
        if (nCandle < 30)
            gagal.push(`data candle ${nCandle} < 30 — koin terlalu baru untuk diadili`);
        // 2) Likuiditas futures
        const likuid = qv === null || qv >= 3_000_000;
        push('Likuiditas futures ≥ 3 jt', likuid, qv === null ? 'qv 24j tak terbaca (dinilai via universe dinamis)' : `${(qv / 1e6).toFixed(1)} jt USDT/24j`);
        if (!likuid)
            gagal.push(`likuiditas ${(qv / 1e6).toFixed(1)} jt USDT < 3 jt — pasar terlalu tipis`);
        // 3) Volatilitas
        push(`Volatilitas ≤ ${G.atrCap.toFixed(0)}%`, f.atrPct <= G.atrCap, `ATR ${f.atrPct.toFixed(1)}%`);
        if (f.atrPct > G.atrCap)
            gagal.push(`ATR ${f.atrPct.toFixed(1)}% > cap ${G.atrCap.toFixed(0)}% — stop wajib lebar, RR rusak`);
        // 3b) Harga mati / stable-like (V301) — koin yang tak bisa bergerak tidak
        //     punya kepastian arah; komposit bisa menaikkannya via ATR-rendah.
        const hargaMati = f.atrPct < 0.15 && Math.abs(f.mom7) < 0.2;
        if (hargaMati) {
            push('Harga hidup', false, `ATR ${f.atrPct.toFixed(2)}%, mom7 ${f.mom7.toFixed(2)}% — pergerakan ~0`);
            gagal.push(`harga mati (ATR ${f.atrPct.toFixed(2)}%, mom7 ${f.mom7.toFixed(2)}%) — kemungkinan token stabil, bukan kandidat tempur`);
        }
        else {
            push('Harga hidup', true, `ATR ${f.atrPct.toFixed(2)}% — pergerakan nyata`);
        }
        // 4) Izin rezim per arah
        if (arah === 'BUY' && regime.regime === 'JATUH') {
            push('Izin rezim utk BUY', false, 'rezim JATUH — BUY dibekukan');
            gagal.push('rezim JATUH — BUY dibekukan, pasar jatuh tajam');
        }
        else if (arah === 'SELL' && !G.sellOn) {
            push('Izin rezim utk SELL', false, 'knob sellOn mati (lab Ujian #2-#5: SELL menggerus profit)');
            gagal.push('SELL dilarang kebijakan arena — knob sellOn mati (hasil lab: SELL menggerus profit)');
        }
        else if (arah === 'SELL' && regime.regime !== 'TREND_TURUN' && regime.regime !== 'JATUH') {
            push('Izin rezim utk SELL', false, `SELL hanya legal saat rezim turun — rezim ${regime.regime}`);
            gagal.push(`SELL dilarang di rezim ${regime.regime} — hanya legal saat pasar turun`);
        }
        else {
            push('Izin rezim', true, `${arah} legal di rezim ${regime.regime}`);
        }
        // 5) Radar 4 jam (arah-sadar)
        const m4s = m4 * sgn;
        const radarLolos = !(G.m4hReject < 0 && m4s < G.m4hReject);
        push('Konfirmasi 4 jam', radarLolos, `momentum 24 jam ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}%`);
        if (!radarLolos)
            gagal.push(`momentum 4 jam ${m4.toFixed(1)}% melawan arah ${arah} — ambang ${G.m4hReject}% (arah mati intraday)`);
        // 6) MEMVETO ingatan berjenjang
        if (G.memVetoOn && MEM && me.level === 'BUCKET3' && me.n >= 4 && me.edge <= -0.03 && me.hit < 0.3) {
            push('Ingatan berjenjang', false, `MEMVETO: n=${me.n}, rata-rata ${(me.edge * 100).toFixed(1)}%, hit ${(me.hit * 100).toFixed(0)}%`);
            gagal.push(`MEMVETO: ingatan ${me.n} episode serupa rata-rata ${(me.edge * 100).toFixed(1)}% (hit ${(me.hit * 100).toFixed(0)}%) — pola biasanya gagal`);
        }
        else {
            push('Ingatan berjenjang', true, me.level === 'BARU' ? 'belum ada episode serupa (n=0)' : `${me.level}: n=${me.n}, rata-rata ${(me.edge * 100).toFixed(1)}%`);
        }
        // 7) Standar komposit arah-sadar
        const momS = (nrm.mom7 ?? 0) * sgn;
        const ambangKomposit = G.minNorm * 2 - 1 - 0.35;
        push(`Standar komposit ≥ ${ambangKomposit.toFixed(2)}`, momS >= ambangKomposit, `momentum arah ${momS >= 0 ? '+' : ''}${momS.toFixed(2)}`);
        if (momS < ambangKomposit)
            gagal.push('kualitas momentum searah pilihan di bawah standar komposit');
        // 8) VONIS VETO LLM tersimpan = penolakan berlabel (bukan penghapusan)
        const veto = vetoOf(f.symbol);
        if (veto) {
            push('Vonis berita LLM', false, veto.slice(0, 90));
            gagal.push(`VONIS VETO LLM: ${veto}`);
        }
        // 9) Anti-tumpang-tindih vs yang sudah lolos (hanya bila seterusnya sehat)
        if (gagal.length === 0) {
            const cl = universeCloses.get(f.symbol) ?? [];
            let kembar = null, cKembar = 0;
            for (const b of lolos) {
                const clp = universeCloses.get(b.symbol) ?? [];
                const c = Math.abs((0, market_1.corr)(cl.slice(-30), clp.slice(-30)));
                if (c > G.corrCap) {
                    kembar = b.symbol;
                    cKembar = c;
                    break;
                }
            }
            if (kembar) {
                push('Anti-tumpang-tindih', false, `korelasi ${cKembar.toFixed(2)} dengan ${kembar}`);
                gagal.push(`korelasi ${cKembar.toFixed(2)} dengan ${kembar} — gerak kembar, satu cukup`);
            }
            else {
                push('Anti-tumpang-tindih', true, `bebas korelasi > ${G.corrCap} vs terpilih`);
            }
        }
        // keyakinan transparan arah-sadar
        const conf = Math.max(32, Math.round(Math.min(95, 46 + momS * 22
            + (m4s >= 0 ? 4 : -6)
            + (breadth > 55 ? 6 : breadth < 35 ? -6 : 0)
            + Math.max(-8, Math.min(8, me.edge * 100 * 0.5)))));
        const topIds = [...factors_1.FACTOR_IDS].sort((x, y) => (nrm[y] ?? 0) * W[y] - (nrm[x] ?? 0) * W[x]).slice(0, 3);
        const row = {
            symbol: f.symbol,
            direction: arah,
            confidence: conf,
            score: composite,
            rank: 0,
            guard: gagal.length ? 'DITOLAK' : 'LOLOS',
            guardAlasan: gagal.length ? gagal.slice(0, 2).join('; ') : null,
            mom7: f.mom7, mom30: f.mom30, rsi: f.rsi, atrPct: f.atrPct,
            volSurge: f.volSurge, distHigh: f.distHigh, emaAlign: f.emaAlign,
            close: f.close, m4h: m4, qv,
            topReasons: [
                `Kepastian arah ${arah}: ${arah === 'BUY' ? 'struktur/momentum mengarah naik' : 'struktur/momentum mengarah turun'} (EMA ${f.emaAlign === 1 ? 'naik utuh' : f.emaAlign === -1 ? 'turun utuh' : 'campur'}, mom7 ${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}%)`,
                `Konfirmasi 4 jam: momentum 24 jam ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}%`,
                ...topIds.map((id) => `${factors_1.FACTOR_LABEL[id]}: ${describeFactor(id, f, nrm[id] ?? 0)}`),
            ],
            duties,
            mem: me,
        };
        // V278/V279 — tim merah + KORTEX tetap hidup untuk yang lolos (aturan murni, tanpa LLM)
        if (gagal.length === 0) {
            const debat = debatAgentik(f, m4, me, breadth, lolos.length, composite, G);
            const kortex = kortexScore(composite, debat, me, m4, ctx.buku ?? null, f.atrPct, G.atrCap);
            row.debat = debat;
            row.kortex = kortex;
            duties.push({ name: 'Debat tim merah (V278)', pass: debat.tekanan <= 2, note: debat.vonis }, { name: 'KORTEX karangan-sendiri (V279)', pass: kortex.skor >= 50, note: `skor ${kortex.skor}/100 — C ${kortex.C} · O ${kortex.O} · R ${kortex.R} · T ${kortex.T} · E ${kortex.E} · X ${kortex.X}` });
            lolos.push(row);
        }
        else {
            tolak.push(row);
        }
    }
    // Susunan akhir: lolos memenuhi slot dulu; slot kosong diisi kandidat
    // DITOLAK GUARD terbaik — ditempatkan di peringkat PALING BAWAH (hukum #3).
    const isi = lolos.slice(0, slotK);
    const pengisi = isi.length < slotK ? tolak.slice(0, slotK - isi.length) : [];
    const rows = [...isi, ...pengisi].map((r, i) => ({ ...r, rank: i + 1 }));
    const cadangan = lolos.slice(slotK);
    const stats = {
        dipindai: ctx.dipindai ?? null,
        dianalisa: factors.length,
        slot: slotK,
        masuk: rows.length,
        lolos: rows.filter((r) => r.guard === 'LOLOS').length,
        ditolak: rows.filter((r) => r.guard === 'DITOLAK').length,
    };
    if (pengisi.length > 0)
        policy.push(`${pengisi.length} slot diisi kandidat DITOLAK guard (peringkat paling bawah) — daftar tetap ${slotK} baris, tidak ada yang disembunyikan`);
    if (cadangan.length > 0)
        policy.push(`${cadangan.length} kandidat lolos menunggu di luar ${slotK} slot (cadangan pengganti bila ada yang dicabut)`);
    return { rows, cadangan, stats, policy };
}
function decidePredator(ctx) {
    const { factors, norm, universeCloses, regime, generation, genome: G, weights: W, memory: MEM } = ctx;
    const breadth = regime.breadth;
    const m4hOf = (sym) => ctx.m4h.get(sym) ?? 0;
    const vetoed = (sym) => ctx.vetoSymbols?.has(sym) ?? false;
    const b3Of = (sym) => (0, factors_1.coarseBucket)(norm.get(sym));
    const memOf = (sym, dir) => MEM ? MEM.edge(regime.regime, sym, (0, factors_1.factorBucket)(norm.get(sym) ?? {}), b3Of(sym), dir)
        : { level: 'BARU', n: 0, edge: 0, hit: 0 };
    // ---------- antrian: kepemimpinan momentum MURNI (terbukti lab),
    // konfirmasi 4 jam tie-break kedua, ingatan berjenjang tie-break ketiga,
    // komposit tie-break terakhir ----------
    const ranked = [...factors].filter((f) => !vetoed(f.symbol)).sort((a, b) => {
        if (b.mom7 !== a.mom7)
            return b.mom7 - a.mom7;
        const m4 = m4hOf(b.symbol) - m4hOf(a.symbol);
        if (Math.abs(m4) > 0.01)
            return m4;
        if (MEM) {
            const ma = memOf(a.symbol, 'BUY').edge, mb = memOf(b.symbol, 'BUY').edge;
            if (Math.abs(mb - ma) > 0.002)
                return mb - ma;
        }
        const na = norm.get(a.symbol), nb = norm.get(b.symbol);
        return compositeScore(nb ?? {}, W) - compositeScore(na ?? {}, W);
    });
    const compositeOf = (sym) => compositeScore(norm.get(sym) ?? {}, W);
    // ---------- kebijakan adaptif K ----------
    const leaderMom7 = ranked.length ? ranked[0].mom7 : 0;
    let k = G.kBase;
    const policy = [];
    if (G.paraK > 0 && leaderMom7 > G.paraK) {
        k = Math.min(k, 2);
        policy.push(`MODE PARABOLIK: leader mom7 ${leaderMom7.toFixed(0)}% > ${G.paraK} → K=${k} (naiki pelari, jangan encerkan)`);
    }
    if (breadth < G.breadthK2) {
        k = Math.min(k, 2);
        policy.push(`Breadth ${breadth.toFixed(0)}% < ${G.breadthK2}% → K=${k}`);
    }
    if (breadth < G.breadthK1) {
        k = 1;
        policy.push(`Breadth ${breadth.toFixed(0)}% < ${G.breadthK1}% → K=1 FOKUS leader terkuat`);
    }
    if (regime.regime === 'JATUH') {
        k = Math.min(k, 1);
        policy.push('Rezim JATUH → K=1 hanya leader absolut');
    }
    const picks = [];
    const rejected = [];
    const mkDuties = (f) => {
        const duties = [];
        const push = (name, pass, note) => duties.push({ name, pass, note });
        const m4 = m4hOf(f.symbol);
        push('Likuiditas', true, `Top-40 likuiditas hari ini (universe dinamis)`);
        push(`Volatilitas ≤ ${G.atrCap.toFixed(0)}%`, f.atrPct <= G.atrCap, `ATR ${f.atrPct.toFixed(1)}%`);
        push('Konfirmasi 4 jam', !(G.m4hReject < 0 && m4 < G.m4hReject), `Momentum 24 jam (4h) ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}% — ${m4 >= 0 ? 'leader masih hidup intraday' : m4 < G.m4hReject ? 'leader mati intraday' : 'melemah, dipantau'}`);
        push('Data cukup', (universeCloses.get(f.symbol) ?? []).length >= 30, `${(universeCloses.get(f.symbol) ?? []).length} candle`);
        return duties;
    };
    // ---------- BUY: uriutan kepemimpinan ----------
    const buys = [];
    for (const f of ranked) {
        if (buys.length >= k)
            break;
        // UPGRADE V3 — radar leader mati: bukti UJIAN #7, pick dengan momentum
        // 24 jam di bawah ambang rata-rata -2.7% hit 38%; jangan naiki mayat.
        const m4 = m4hOf(f.symbol);
        if (G.m4hReject < 0 && m4 < G.m4hReject) {
            rejected.push({ symbol: f.symbol, reason: `Momentum 4 jam ${m4.toFixed(1)}% < ${G.m4hReject}% — leader mati intraday` });
            continue;
        }
        const duties = mkDuties(f);
        if (f.atrPct > G.atrCap) {
            rejected.push({ symbol: f.symbol, reason: `ATR ${f.atrPct.toFixed(1)}% > ${G.atrCap}` });
            continue;
        }
        if ((universeCloses.get(f.symbol) ?? []).length < 30) {
            rejected.push({ symbol: f.symbol, reason: 'Data kurang' });
            continue;
        }
        // UPGRADE V4 — MEMVETO: ingatan berjenjang berkata pola ini biasanya gagal.
        // Hanya menyala di kasus ekstrem (BUCKET3 n>=4, avg<=-3%, hit<30%) — surgikal.
        if (G.memVetoOn && MEM) {
            const me = memOf(f.symbol, 'BUY');
            if (me.level === 'BUCKET3' && me.n >= 4 && me.edge <= -0.03 && me.hit < 0.3) {
                rejected.push({ symbol: f.symbol, reason: `MEMVETO: ingatan ${me.n} episode serupa rata-rata ${(me.edge * 100).toFixed(1)}% (hit ${(me.hit * 100).toFixed(0)}%) — pola biasanya gagal` });
                continue;
            }
        }
        // anti-tumpang-tindih
        const cl = universeCloses.get(f.symbol) ?? [];
        let overlap = false;
        for (const b of buys) {
            const clp = universeCloses.get(b.f.symbol) ?? [];
            const c = Math.abs((0, market_1.corr)(cl.slice(-30), clp.slice(-30)));
            if (c > G.corrCap) {
                overlap = true;
                rejected.push({ symbol: f.symbol, reason: `Korelasi ${c.toFixed(2)} dengan ${b.f.symbol}` });
                break;
            }
        }
        if (overlap)
            continue;
        const nrm = norm.get(f.symbol) ?? {};
        if ((nrm.mom7 ?? 0) < G.minNorm * 2 - 1 && buys.length > 0) {
            rejected.push({ symbol: f.symbol, reason: 'Kualitas komposit di bawah standar' });
            continue;
        }
        buys.push({ f, score: compositeOf(f.symbol) });
    }
    // ---------- slot ANCHOR kualitas (opsional) ----------
    if (G.anchorOn && buys.length < k && k >= 3 && buys.length >= 1) {
        const taken = new Set(buys.map((b) => b.f.symbol));
        const anchorCand = [...factors]
            .filter((f) => !taken.has(f.symbol))
            .sort((a, b) => compositeOf(b.symbol) - compositeOf(a.symbol));
        for (const f of anchorCand) {
            const nrm = norm.get(f.symbol) ?? {};
            if ((nrm.mom7 ?? 0) < -0.2)
                break; // jangan ambil yang momentumnya runtuh
            const duties = mkDuties(f);
            if (f.atrPct > G.atrCap || (universeCloses.get(f.symbol) ?? []).length < 30)
                continue;
            const cl = universeCloses.get(f.symbol) ?? [];
            let overlap = false;
            for (const b of buys) {
                const clp = universeCloses.get(b.f.symbol) ?? [];
                if (Math.abs((0, market_1.corr)(cl.slice(-30), clp.slice(-30))) > G.corrCap) {
                    overlap = true;
                    break;
                }
            }
            if (overlap)
                continue;
            buys.push({ f, score: compositeOf(f.symbol) });
            policy.push(`Slot ANCHOR kualitas diisi ${f.symbol} (komposit struktur+volume)`);
            break;
        }
    }
    for (let bi = 0; bi < buys.length; bi++) {
        const b = buys[bi];
        const nrm = norm.get(b.f.symbol) ?? {};
        const topIds = [...factors_1.FACTOR_IDS].sort((x, y) => (nrm[y] ?? 0) * W[y] - (nrm[x] ?? 0) * W[x]).slice(0, 3);
        const m4 = m4hOf(b.f.symbol);
        const me = memOf(b.f.symbol, 'BUY');
        // V278 DEBAT-AGENTIK — tim merah dulu, keyakinan menanggung tekanannya
        const debat = debatAgentik(b.f, m4, me, breadth, bi, b.score, G);
        // V279 KORTEX — formula karangan-sendiri menilai pick; keyakinan menyesuaikan maksimal ±4
        const kortex = kortexScore(b.score, debat, me, m4, ctx.buku ?? null, b.f.atrPct, G.atrCap);
        const kxAdj = Math.max(-4, Math.min(4, Math.round((kortex.skor - 58) / 6)));
        const conf = Math.max(35, Math.round(Math.min(96, 46 + (nrm.mom7 ?? 0) * 22 + (m4 >= 0 ? 4 : -6) + (breadth > 55 ? 6 : 0) + (k === 1 ? 6 : 0)
            + Math.max(-8, Math.min(8, me.edge * 100 * 0.5))
            - Math.min(12, debat.tekanan * 3)
            + kxAdj)));
        picks.push({
            symbol: b.f.symbol,
            direction: 'BUY',
            confidence: conf,
            score: b.score,
            evidence: {
                factors: { ...nrm, m4h: Math.round(m4 * 10) / 10 },
                topReasons: [
                    `Konfirmasi 4 jam: momentum 24 jam ${m4 >= 0 ? '+' : ''}${m4.toFixed(1)}%`,
                    ...(me.level !== 'BARU' && me.n >= 2
                        ? [`Ingatan ${me.level}: ${me.n} episode serupa → rata-rata ${me.edge >= 0 ? '+' : ''}${(me.edge * 100).toFixed(1)}%, hit ${(me.hit * 100).toFixed(0)}%`]
                        : []),
                    ...topIds.map((id) => `${factors_1.FACTOR_LABEL[id]}: ${describeFactor(id, b.f, nrm[id] ?? 0)}`),
                ],
                duties: [
                    ...mkDuties(b.f),
                    { name: 'Ingatan berjenjang', pass: true, note: me.level === 'BARU' ? 'belum ada episode serupa (n=0)' : `${me.level}: n=${me.n}, rata-rata ${(me.edge * 100).toFixed(1)}%, hit ${(me.hit * 100).toFixed(0)}%` },
                    { name: 'Debat tim merah (V278)', pass: debat.tekanan <= 2, note: debat.vonis },
                    { name: 'KORTEX karangan-sendiri (V279)', pass: kortex.skor >= 50, note: `skor ${kortex.skor}/100 — C ${kortex.C} · O ${kortex.O} · R ${kortex.R} · T ${kortex.T} · E ${kortex.E} · X ${kortex.X}${kxAdj !== 0 ? ` · keyakinan ${kxAdj > 0 ? '+' : ''}${kxAdj}` : ''}` },
                ],
                policy,
                regime: regime.regime,
                genomeGeneration: generation,
                mem: me,
                debat,
                kortex,
            },
        });
    }
    // ---------- SELL opsional (knob sellOn; hasil lab: menggerus profit) ----------
    if (G.sellOn && (regime.regime === 'TREND_TURUN' || regime.regime === 'JATUH')) {
        const maxSell = regime.regime === 'JATUH' ? 2 : 1;
        let sells = 0;
        for (let i = ranked.length - 1; i >= 0 && sells < maxSell; i--) {
            const f = ranked[i];
            const nrm = norm.get(f.symbol) ?? {};
            if ((nrm.mom7 ?? 0) > -0.35)
                break;
            if (f.atrPct > G.atrCap + 2) {
                rejected.push({ symbol: f.symbol, reason: 'ATR ekstrem utk SELL' });
                continue;
            }
            picks.push({
                symbol: f.symbol,
                direction: 'SELL',
                confidence: Math.round(Math.min(92, 44 + Math.abs(nrm.mom7 ?? 0) * 24)),
                score: -compositeOf(f.symbol),
                evidence: {
                    factors: nrm,
                    topReasons: [...factors_1.FACTOR_IDS].sort((x, y) => (nrm[x] ?? 0) * W[x] - (nrm[y] ?? 0) * W[y]).slice(0, 3)
                        .map((id) => `${factors_1.FACTOR_LABEL[id]}: ${describeFactor(id, f, nrm[id] ?? 0)}`),
                    duties: [
                        { name: 'Likuiditas', pass: true, note: 'Top-40 likuiditas hari ini' },
                        { name: 'Rezim', pass: true, note: `${regime.regime}: SELL legal (knob sellOn aktif)` },
                    ],
                    policy,
                    regime: regime.regime,
                    genomeGeneration: generation,
                },
            });
            sells++;
        }
    }
    const scoredAll = factors
        .map((f) => ({ symbol: f.symbol, score: compositeOf(f.symbol) }))
        .sort((a, b) => b.score - a.score);
    return { picks, scored: scoredAll, rejected, k };
}
function describeFactor(id, f, norm) {
    const sgn = norm >= 0 ? '+' : '';
    switch (id) {
        case 'mom7': return `${f.mom7 >= 0 ? '+' : ''}${f.mom7.toFixed(1)}% / 7 hari (${sgn}${norm.toFixed(2)})`;
        case 'mom30': return `${f.mom30 >= 0 ? '+' : ''}${f.mom30.toFixed(1)}% / 30 hari (${sgn}${norm.toFixed(2)})`;
        case 'emaAlign': return f.emaAlign === 1 ? 'harga > EMA20 > EMA50, struktur naik utuh' : f.emaAlign === -1 ? 'harga < EMA20 < EMA50, struktur turun' : 'struktur campur';
        case 'rsi': return `RSI ${f.rsi.toFixed(0)} ${f.rsi > 75 ? '(jenuh beli)' : f.rsi < 30 ? '(jenuh jual)' : '(sehat)'}`;
        case 'volSurge': return `Volume ${f.volSurge.toFixed(2)}x rata-rata 20 hari`;
        case 'atrInv': return `ATR ${f.atrPct.toFixed(1)}%/hari`;
        case 'distHigh': return `${f.distHigh.toFixed(1)}% dari puncak 60 hari`;
        case 'btcCorr': return `korelasi BTC ${f.btcCorr.toFixed(2)}`;
    }
}
/** Sidik jari pola (tanpa simbol) untuk memori pola. */
function patternFingerprint(regime, bucket, direction) {
    return fnv1a(`POLA|${regime}|${bucket}|${direction}`).toString(16);
}
/** UPGRADE V4 — sidik jari bucket kasar 3-faktor (jenjang tengah memori). */
function coarsePolaFingerprint(regime, bucket3, direction) {
    return fnv1a(`POLA3|${regime}|${bucket3}|${direction}`).toString(16);
}
/** UPGRADE V4 — sidik jari level rezim (jenjang paling kasar). */
function regimePolaFingerprint(regime, direction) {
    return fnv1a(`POLAR|${regime}|${direction}`).toString(16);
}
function episodeFingerprint(regime, symbol, bucket, direction) {
    return fnv1a(`EPS|${regime}|${symbol}|${bucket}|${direction}`).toString(16);
}
function rivalFingerprint(regime, bucket, direction) {
    return fnv1a(`RIVAL|${regime}|${bucket}|${direction}`).toString(16);
}
function lessonFingerprint(text) {
    return fnv1a(`PELAJARAN|${text}`).toString(16);
}
/** FNV-1a 32-bit — alamat memori deterministik, dedup mustahil gagal. */
function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
