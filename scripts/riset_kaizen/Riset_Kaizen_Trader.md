# Dossier Deep-Screening: "Kaizen Trader" (Mandat Pemilik — Task 48 / V259)

Tanggal: 2026-10-02 (UTC+8). Metode: 7 query web search + fetch langsung sumber resmi
(README GitHub penuh, 3 file kode sumber, portofolio pencipta, HOL registry, 3 situs produk).
Bukti mentah tersimpan di folder ini (gh_readme.md, src_*.py, hol_kaizen.html, web_*.html, s1-s7.json).

## Identitas — "Kaizen Trader" adalah SATU KELUARGA, bukan satu produk

Screening menemukan 6 entitas "Kaizen" di dunia trading-AI; yang relevan & teraudit:

1. **kaizen-trader (prateekjain98, GitHub, MIT, open-source)** — INI SASARAN UTAMA.
   "Autonomous perpetual-futures crypto trading engine... heals itself by having Claude
   analyze its own trading logs and improve strategies." Stack: Python + Claude API +
   Convex + Binance Futures/OKX + GCP VM + GitHub Actions auto-deploy + systemd + watchdog.
   Klaim live: +18.2% ($37.36 → $44.17) @ 1x leverage, funding squeeze +26%.
2. **KAIZEN (Virtuals Protocol, ekosistem sama dengan Gekko)** — "institutional-grade
   quantitative trading agent operating exclusively on Hyperliquid". ACP, Base,
   0x8a6Ab2989EeDB3234cF57cbf1F78300B5d3b75Dc. Trust score masih 0 (baru) — dokumentasi
   publik tipis; diadopsi prinsip SPESIALIZASI-nya saja.
3. **Kaizen RegimeBot (kaizen-daytrading.com, NinjaTrader 8)** — regime-adaptive: 5 input
   (VIX level, VIX vs 200d trend, ATR ratio, TPU index, realized vol) → klasifikasi harian →
   TEPAT SATU dari 4 strategi aktif — atau OFF (~17% hari tanpa edge). Fail-safe: data
   gagal → tetap flat. 6 bulan out-of-sample holdout.
4. **kaizen.cash** — "AI trading copilot where you stay in control": otonomi berjenjang
   (sarankan → review → eksekusi dalam aturan pemilik).
5. **thekaizentrader.com** — jurnal trading + chart scanner + mental prep (untuk manusia).
6. **kaizen-agent.ai** — pipeline pelatihan yang mengoptimalkan otomasi setiap run.

## KUNCI INTI (dari kode + dokumentasi teraudit, bukan marketing)

### A. Empat Loop Penyembuhan-Diri (portfolio pencipta menyebutnya eksplisit)
"4 Healing Loops: **Rule healer, Claude analysis, Delta revert, Darwinian selector**"
1. **Rule healer** — aturan yang hit-rate-nya kolaps dikarantina, bukan dibiarkan meracuni keputusan.
2. **Claude analysis** — bedah mendalam terjadwal menulis pelajaran ke memori.
3. **Delta revert** — perubahan parameter adalah EKSPERIMEN: diuji vs baseline; bila lebih buruk → DIREVERT. Kaizen sesungguhnya: perbaikan harus diverifikasi, bukan diasumsikan.
4. **Darwinian selector** — seleksi strategi berdasar sintas medan; yang kalah, mati.

### B. Arsitektur keputusan (dari rule_brain.py, 808 baris)
- Hard-filter dulu (sudah memegang posisi, modal < ambang, kuota posisi, % modal terpakai) — BARU skor.
- 12 faktor aditif, SETIAP kenaikan skor berlabel & diaudit ("factors.append(...)").
- P0/P1/P2 audit fixes di kode = jejak loop penyembuhan: (i) atribusi strategi hanya boleh diklaim satu (risiko stop/target harus mengikuti strategi yang BENAR-BENAR memicu, bukan yang cepat mengklaim); (ii) bonus kontrarian TIDAK BOLEH diberikan ke sinyal berlawanan arah; (iii) umur pompa tidak diketahui → diperlakukan TUA (konservatif pada kekaburan).

### C. Disiplin risiko (README + executor)
- Cooldown anti-dendam: per-simbol 2 kekalahan beruntun → dingin 4 jam; per-strategi 3 kekalahan beruntun → dingin 30 menit.
- Henti harian: MAX_DAILY_LOSS → SEMUA trading berhenti hari itu.
- 8 kondisi keluar eksplisit: stop/target/trailing/timeout/fast-cut/chop-exit/thesis-break/daily-halt.
- Chop exit: modal mati (held >60 menit, gerak <2%) → potong.
- Thesis-break: tesis asal patah → tutup apa pun P&L-nya.
- Watchdog PROSES TERPISAH: hard stop 15%/40% yang hidup meski otak hang — pertahanan berlapis.

### D. Kesegaran gerakan (SYSTEM_PROMPT ClaudeBrain)
"1H ACCELERATION is THE key signal. Fresh breakouts > stale pumps... NEVER chase tokens
already up +100% on 24h WITHOUT >5% 1h acceleration. Late entries are exit liquidity."
"PATIENCE IS EDGE. Zero trades on a quiet market is the correct answer."

### E. Regime-strategy binding (RegimeBot)
Satu rezim → satu keluarga strategi yang terbukti sejarah — atau NO-TRADE sebagai
keluaran yang DIREKAYASA (bukan kegagalan). Validasi out-of-sample wajib.

### F. Otonomi berjenjang (kaizen.cash)
Sarankan dulu → direview → eksekusi hanya dalam aturan yang ditetapkan pemilik.

## Yang SAKTI SUDAH PUNYA (tidak diadopsi ulang): meta-inferensi regret (Gekko), odds ranking
(Trade Ideas), rencana deal SO/BEP/trailing (3Commas), sekolah kelulusan hit-rate, veto gates,
suhu pasar, sidik tamper-evident, ekspresi dinamis.

## YANG BENAR-BENAR BARU → diinjeksi (7 kunci, V259-KAIZEN)
1. ujiBalik (delta-revert PDCA) — eksperimen param diuji vs baseline; lebih buruk → DIREVERT.
2. karantina (rule healer) — sekolah jadi dua arah: lulus ATAS, karantina BAWAH.
3. dinginDendam (anti-revenge cooldown) — per-sasaran & per-fam kekalahan beruntun.
4. hentiHarian (daily loss halt) — circuit breaker rugi-realized harian memaksa BERTAHAN.
5. modalMati + tesisPatah (chop & thesis-break exit) — perluasan taksonomi keluar rencana deal.
6. kesegaran (freshness guard) — pompa-tua tanpa akselerasi segar → veto; umur tak diketahui = tua.
7. penjagaKedua (watchdog ledger) — hard-stop independen yang tercatat saat kunci & dicek tiap denyut di luar otak skor.

## Sumber (URL utama)
- https://github.com/prateekjain98/kaizen-trader (+ README penuh, src/engine/{rule_brain,claude_brain,signal_detector}.py)
- https://prateekjain.io (portofolio: "4 Healing Loops")
- https://hol.org/registry/agent/uaid:aid:9quBQSRbaUGSZzJ5VCfvrF4AScUU5i75N78BrTdz39xC12V2UqwpokdGeiex3ZUqTy (KAIZEN Virtuals)
- https://kaizen-daytrading.com/bots (RegimeBot)
- https://kaizen.cash ; https://thekaizentrader.com ; https://kaizen-agent.ai
