# Deep-Screening Gekko Agent (Axal) — Bukti Riset V258-GEKKO-CZAR

Tanggal riset: 2026-10-02 (UTC+8). Metode: web search multi-query + fetch halaman sumber
resmi langsung (bukti HTML/TXT tersimpan di folder ini). Tidak ada klaim tanpa sumber.

## Identitas terkonfirmasi (multi-sumber)
- Gekko Agent = "Gekko AI by Virtuals" (GEKKO, token di Base, kontrak 0xf7b0dd0b…43c8)
  — dikembangkan **Axal**, jaringan **verifiable agents**; fokus: agents × trading × automation.
  Sumber: Coinbase (coinbase.com/price/base-gekko-ai-by-virtuals), CoinGecko, CryptoSlate,
  Phantom, X @getaxal status 1870139278367273117 ("We launched @Gekko_Agent, an AI Agent
  on @virtuals_io integrating with Autopilot").
- Peluncuran: Des 2024 bersama Virtuals Protocol; alokasi tim/investor ZERO (fair launch)
  — axal.substack.com/p/why-we-launched-gekko (bukti p_why_gekko.txt).
- Awalnya agen analisis pasar ber-persona "1980s Wall Street", rencana integrasi Autopilot;
  membawa banjir user ke Autopilot; menarik investasi Sekoia Virtuals.

## Kunci inti #1 — Meta-inferensi kolektif (Allora Topics) → Gekko
Sumber: allora.network/blog/gekko-ai-allora-a-new-edge-in-automated-trading (Mei 8 2025,
bukti p_allora.txt):
- Allora = jaringan ML terdesentralisasi: model spesialis bertanding dalam "Topics"
  (topik: prakiraan harga); tiap inferensi dibobot **akurasi historis + kontekstual**
  → meta-inferensi yang terus membaik ("consistently outperforms its individual components",
  "weighted by historical and contextual accuracy").
- Gekko memakai feed prediksi itu → "dynamically adjust strategies mid-flight, reducing lag".

## Kunci inti #2 — CZAR Loss (decisiveness terukur)
Sumber: arXiv 2609.36061, Allora Foundation (Pfeffer, Kruijssen, Stecker, Longmore),
"Introducing the CZAR Loss: A Tailored Objective Function for Financial Log-Return
Predictions", diserahkan 28 Sep 2026, terbit ADI 3, 33-54 (2026) (bukti p_czar_abs.txt):
- Bias nol: mean log-return ≈ 0 → loss simetris (MSE/MAE) menjadikan "prakiraan nol"
  hampir optimal; prediktor nol bisa mengalahkan model dengan akurasi arah 58% pada
  ranking berbasis loss ("trivial forecasters can lead loss-based rankings").
- CZAR (Composite Zero-Agnostic Return): piecewise quadratic, 5 syarat — convexity,
  asimetri mengikuti arah return nyata (hilang di nol), penalti near-linear utk
  undershoot & arah salah, divergensi utk error besar, adaptive loss floor utk evaluasi.
- Hasil: ambang akurasi arah utk mengalahkan prediktor-nol tetap ~50% (chance), vs naik
  tajam utk loss simetris; LightGBM intraday BTC: akurasi arah pada gerakan besar naik.
- Prinsip (LinkedIn Allora Labs): "small loss to a prediction in the right direction that
  overshoots a large move, and a large loss to one that undershoots or points the wrong way".

## Kunci inti #3 — Eksposur dinamis dari prakiraan volatilitas (Allora × Virtuals G.A.M.E)
Sumber: allora.network/blog/allora-powers-virtuals-protocol (Jan 30 2025, bukti p_virtuals.txt):
- "Agents can utilize Allora's price and upcoming volatility forecasts to autonomously
  adjust leverage... increasing exposure during favorable conditions and reducing it during
  downturns" (looping strategy agents).
- Meta-strategy: realokasi modal antar sub-strategi ber-prakiraan terbaik.
- Intelligent DCA: prakiraan multi-interval menentukan waktu & ukuran pembelian.

## Kunci inti #4 — Divergensi prediksi vs probabilitas pasar
Sumber: allora.network/blog/inside-the-allora-prediction-markets-ecosystem (snippet search):
"Agents and trading bots subscribe to Allora's inferences ... and enter when the forecast
**diverges** from market-implied probability" — edge dari perbedaan ramalan vs harga pasar.

## Kunci inti #5 — Autopilot: profil risiko → strategi & eksekusi bertahap
Sumber: axal.substack.com/p/introducing-axal-autopilot (Okt 22 2024, bukti p_autopilot.txt):
- "5-question risk assessment" → alokasi strategi personal (yield → memecoin).
- Memantau proyek top-volume agar tak ketinggalan peluang; rebalancing & cash-out otomatis;
  fase-masuk bertahap (phase into positions); session keys utk keamanan agen.

## Kunci inti #6 — Verifiable autonomy (Axal)
Sumber: blog Allora "About Axal" + docs.axal.com/how-it-works/contracts (snippet):
jaringan verifiable agents, intent marketplace, kontrak memverifikasi routing/alokasi/
rebalance — aksi agen bisa diverifikasi pihak ketiga.

## Peta adopsi → V258-GEKKO-CZAR (penjaga.mjs v5.4)
| Kunci | Adaptasi SAKTI | Lapis |
|---|---|---|
| 1 Meta-inferensi Topics | `metaInferensi()` — 6 topik pekerja (momentum/tren/aliran/derivatif/mikrostruktur/relatif) memberi suara arah; bobot = exp(−0.9·regret) diperbarui tiap vonis matang (regret-minimized, ala Allora) | observasi-disekolahkan |
| 2 CZAR | `skorCzar()` — skor asimetris magnitude-aware utk vonis matang (benar: reward near-linear cap 8%, salah: floor 1.5 + kuadratik); `akurasiImpas` = breakeven WR = rugiRata/(menangRata+rugiRata); `darahAkurasi` = akurasi − impas | evaluasi & sekolah |
| 3 Eksposur dinamis | `ekspresiSkala()` — skala 0.25×–1.0× unit dari odds+keyakinan−volatilitas ekstrem−kerumunan funding; dipra-registrasi & dibandingkan medan (tinggi vs rendah) | pra-registrasi |
| 4 Divergensi | `probPasar()` — P(BUY) implisit pasar dari lsTaker/lsAkun/funding/EMA4h; `divergensi` = keyakinan komite − P(arah komite); bucket kuat/lemah dinilai medan | observasi-disekolahkan |
| 5 Autopilot temper | `suhuPasar()` — AGRESIF/NETRAL/BERTAHAN dari PF-jendela+rezim+breadth+F&G; BERTAHAN: ambang odds +5 & kuota −1; AGRESIF: ambang −3 (lantai 52), kuota tak pernah >3; PF<1 MEMAKSA BERTAHAN | gerbang terikat-batas |
| 6 Verifiable | `sidikPrakunci` = sha256 payload prediksi saat kunci — tamper-evident | integritas |

Registri: 127 → 145 param bernama (+5 kandidat: metaArah/metaKeyakinan/probPasar/divergensi/
ekspresi; +5 siklus: suhuTemper/ambangOddsEfektif/kuotaArahEfektif/akurasiImpas/darahAkurasi;
+8 konstanta: czarCap/czarFloor/regretEta/regretDecay/ekspresiMin/ekspresiMaks/divergKuat/suhuAmbang).

Hukum rumah tak berubah: semua param Gekko lahir OBSERVASI — dinarasikan, disekolahkan,
berhak VETO lewat gerbang yang sudah ada; TIDAK berbobot genome sebelum hit-rate medan lulus.
Satu perubahan gerbang terikat-batas (suhuPasar) didokumentasi & bisa diaudit per denyut.

## File bukti di folder ini
p_allora.{html,txt}, p_why_gekko.{html,txt}, p_agora.{html,txt}, p_axal_home.{html,txt},
p_blockworks.html, p_czar_abs.{html,txt}, p_gate.html, p_autopilot.{html,txt},
p_virtuals.{html,txt}, s1-s5.json (hasil search).
