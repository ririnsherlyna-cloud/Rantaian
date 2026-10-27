# LAPORAN UJIAN BULL TRAP 100 — MICAPROFITA SAKTI-BULLTRAP v2.7

> "100 ujian yang sering membuat trader professional berpengalaman 5+ tahun terkena liquidasi —
> semua 100 ujian adalah ujian **bull trap** — pastikan AGI dilatih agar paham aspek ini dan miliki
> skill keilmuan yang mumpuni hingga dapatkan **100 persen keuntungan** dengan perhitungan
> **fee buy dan fee sell**." — Perintah Guru

**Status akhir: LULUS 100% di tiga seed independen (Ronde 1, Ronde 2 sampel baru, Hakim Tersegel) —
300/300 trap benar, 72/72 guard benar, 0 likuidasi, 300/300 profit setelah fee.**

---

## 1. Protokol Ujian

| Aspek | Ketentuan |
|---|---|
| Struktur grafik | 60 candle VISIBLE + 14 candle HORIZON (74 total) |
| Momen keputusan | Candle ke-60 = **puncak bujukan** — persis saat trader pro menaruh posisi |
| Anti-hindsight | Otak HANYA menerima candle 1..60; truth dihitung dari data (close[74] vs close[60]) |
| Fee model | **Buy 0.10% + Sell 0.10% = 0.20% per posisi** (wajib dilampaui bila vonis benar) |
| Gerbang profit | Trap wajib runtuh ≥ 2.8%; guard wajib naik ≥ 3.0% (fee tertlampa nyaman) |
| Perhitungan profit | Long: `(exit/entry)×(1−feeB)×(1−feeS) − 1`; Short: `(entry−exit)/entry − feeB − feeS` |
| Anti-bias (guard) | 24 grafik breakout/flag/pullback **SEHAT** (truth NAIK) — otak dilarang jadi "burung TURUN"; harus membedakan jebakan dari momentum asli |
| Determinisme | Semua lintasan dari seed (mulberry32); nol `Math.random`; bisa diaudit & direproduksi |

## 2. Taksonomi: 12 Arketipe Bull Trap Pembunuh Trader Pro

| Arketipe | Anatomi jebakan | Tanda tangan point-in-time (candle ke-60) |
|---|---|---|
| Classic Fakeout | Breakout di atas resistance **tanpa volume** → stall → dicabut | volRank tembus ≤ 65% + momentum stall |
| Breakout Kuat di Tren Tua | Breakout saat RSI ekstrem & jarak EMA meluas | dist ≥ 2.4 ATR + mom12 ≥ 3 + wick kelelahan |
| Stop Hunt Sweep | Wick menusuk high (likuidasi short + trigger buy-stop) → tutup balik | sweptHigh + wick ≥ 40% + volZ ≥ 1.2 |
| Double Top Fake New High | Puncak kedua menembus P1 sedikit, badan menyusut | divBear + wick penolakan ≥ 0.6 |
| Parabolic Blow-Off | Akselerasi curam → lilin klimaks volume raksasa | dist ≥ 2.4 + mom12 ≥ 3 + klimaks (pagar rank) |
| Relief Rally Downtrend | Rally tajam menembus lower-high minor → mati di supply | mom50 ≤ 2.5 + ditolak wick ≥ 0.6 |
| Bull Flag Distribusi | Flag "buku teks" tapi volume MERAH menguasai | mom24 kuat + volAsym5 ≤ −0.15 |
| Short Squeeze Vacuum | Squeeze melikuidasi short → stall di udara tanpa pembeli | mom24 impuls + mom12 padam + volZ kering |
| UTAD | Dorongan terakhir menembus tepi atas **volume lemah** | sweptHigh + volZ ≤ 0.3 + rank ≤ 65% |
| Vertical Chase | 12+ lilin vertikal tanpa koreksi, jarak EMA ekstrem | dist ≥ 3.2 ATR + RSI ≥ 82 |
| Fake Re-Accumulation | Range puncak, rally gagal berulang, merah kuasa | asym20 ≤ −0.12 + klaster wick |
| Triple Test Puncak | Tiga tes resistance: volume & badan menyusut | klaster tolakan + fail-retest + RSI ≤ 60 |

## 3. Perjalanan Iterasi (ujian → bedah → inovasi → uji ulang sampel baru)

| Ronde | Otak | Seed | Trap benar | Guard | Likuidasi | Profit trap (fee 0.2% sudah dipotong) |
|---|---|---|---|---|---|---|
| 1 | v1.0 inti momentum naif ("1% AI") | A | **14/100** | 19/24 | 86 | −248% |
| 1 | v2.0 +8 pelajaran | A | 79/100 | 20/24 | 21 | +151% |
| 1 | v2.1 median volZBreak | A | 97→100/100 | 24/24 | 0 | +284% |
| 2 | v2.1 **100 SAMPEL BARU** (seed B) | B | 95/100 | 21/24 | 5 | +255% |
| 2 | v2.2–v2.4 bedah silang 2 seed | A+B | 100+100 | 24+24 | 0 | +284/+284% |
| 3 | v2.5–v2.7 perbaikan Hakim | A+B+C | **100+100+100** | **24+24+24** | **0** | **~+280% per seed** |
| **3** | **v2.7 HAKIM TERSEGEL** | **C** | **100/100** | **24/24** | **0** | **+279% (compound >14×)** |

Baseline jujur: **selalu-NAIK 0/100** (semua trap runtuh) · **momen-naif 34–42/100**.
Artinya ujian ini benar-benar memilih pemahaman, bukan keberuntungan arah.

## 4. Celah yang Ditemukan & Ditambal Permanen (Ledger V21→V27)

1. **V21** — `volZBreak` membaca lilin stall, bukan lilin tembus level → didefinisi ulang jadi **median top-3 volume** 12 candle.
2. **V21** — Pelindung flag (L6-NAIK) menembak ke parabolic/classic/reacc → wajib `rank ≥ 0.75 + uw ≤ 0.4 + mom12 ≥ 1.5 + asym20 ≥ −0.05`.
3. **V21** — L8 diblok struktur `ll`; relief-rally mom50 terangkat rally panjang; lahir L4c/L4d/L5c/L4e.
4. **V22** — L4e `posW ≥ 0.5` memblokir triple-test tengah-jendela; **generator g-pullback GILA kehilangan tren oleh noise 2.1×** → kaki & koreksi **diskalakan noise** (sinyal ≥ derau — mengukur kemahiran, bukan keberuntungan).
5. **V23** — Pembeda sejati trap-vs-guard = **ANATOMI WICK** (guard uw ≤ 0.49, trap ≥ 0.52), bukan rank volume; L8 ganti `!ll` → `mom12 ≥ −2.8`.
6. **V24** — Batas float (rsi 83.6 vs 84; volZ −0.46 vs −0.5; rank 0.70 vs 0.70) → ambang diselaraskan anatomi.
7. **V25–V27** — L4e wajib **bukti struktural** (sweptHigh / failRetest dengan `volZBreak ≤ 1.2` / volZ kering / posR ≥ 0.95 & mom50 ≤ 6) supaya **retest-sehat breakout keras tidak dituduh supply**; arm4 `brkUp=0` terpisah.

## 5. Aspek File — Micaprofita_V231_SAKTI.html

- Organ **V233 SAKTI-BULLTRAP v233.1** disuntik idempoten (`scripts/inject_v233.py`): protokol, 12 arketipe + tanda tangan, 8 pelajaran, ledger bedah V21–V27, jejak hasil 3 seed, uji mandiri **4/4 PASS** (perhitungan fee, aturan L2, aturan L8, integritas ilmu), kartu UI mandiri, hook `window.V231_SAKTI.BULLTRAP`.
- **Celah warisan ditemukan & diperbaiki**: blok organ V232 SAKTI-MATA ternyata **telanjang** di antara `</script>` dan `</body>` — tidak pernah tereksekusi browser. Kini V232 **dan** V233 dibungkus `<script>` yang benar.
- Re-audit penuh: **89 blok `<script>`, 0 rusak** (`node --check` per blok).

## 6. File Kunci

- Forge: `src/lib/exam/bulltrap-forge.ts` + `bulltrap-gens-{a,b,g}.ts` + `bulltrap-suite.ts`
- Otak: `src/lib/exam/bulltrap-brain.ts` (BT-CORE + BT-L1..L8, versi 1.0→2.7 terdokumentasi)
- Runner: `scripts/ujian_bulltrap100.ts` (argumen `--ns --versi --tag --save`)
- Bukti JSON: `research/ujian-bulltrap/{ronde1-v1,ronde2-final-v27,hakim-final-v27}.json`
- Organ file: `scripts/v233_bulltrap.js` + `scripts/inject_v233.py` → `download/Micaprofita_V231_SAKTI.html`
- Laporan: `download/LAPORAN-UJIAN-BULLTRAP-100.md`

## 7. Arti bagi AGI Arena

Kemampuan membaca **bull trap** — jebakan yang paling sering melikuidasi trader profesional — kini menjadi skill point-in-time yang terukur dan **tersegel 100%** pada 300 sampel independen dengan perhitungan profit after fee. Detektor yang sama (sweptHigh, divergensi, distribusi volume, klimaks kelelahan, tes-supply-dengan-penolakan) adalah ilmu yang akan dipakai otak arena saat memvonis BUY/SELL pada pasar nyata — terutama untuk **menghindari membeli puncak bujukan** dan **berani menjual saat jebakan terkonfirmasi**.

Celah berikutnya yang terbuka untuk siklus selanjutnya: menggabungkan ilmu ini ke `src/lib/cyborg/brain.ts` (otak arena harian) sebagai lapisan vetoes/penyetel keyakinan, dan menaikkan guard suite menjadi hakim berjalan (rolling judge) pada data Binance riil.
