# RISET DEEP-SCREENING CLAWTRADE — untuk Mandat V261

Tanggal: 2026-10-02 · Metode: web search 4 query + clone 2 repo + bedah kode sumber + fetch situs.
Bukti mentah: q1-q4.json (hasil search), repo_clawtrade_mid/ (clone yuxuan-lou/ClawTrade HEAD aktif),
repo_clawtradeai/ (clone clawtradeai-Agent/ClawTradeAI, MIT), arena.html (clawtrade.net — TIDAK TERJANGKAU,
dicatat jujur).

## 1. IDENTITAS — "clawtrade" adalah SATU KELUARGA (2 anggota terverifikasi dari kode sumber)

| Anggota | Repo | Bahasa | Lisensi | Esensi |
|---|---|---|---|---|
| **ClawTrade** (middleware) | github.com/yuxuan-lou/ClawTrade | Python/Flask, Docker | — | Security middleware: AI agent (OpenClaw dll.) trading akun broker LEBIH JEMBATAN BERGEBANG; 4 broker (IBKR, Alpaca, Longbridge, Tiger); pasar US/HK/A-share/SG/EU/APAC |
| **ClawTrade AI** (Solana) | github.com/clawtradeai-Agent/ClawTradeAI (clawtradeai.xyz) | TypeScript, BullMQ, Fastify | MIT | Platform otonom on-chain Solana: 6 agent spesialis (Sniper/Analyst/RiskManager/Strategy/Executor/Coordinator) + Jupiter routing |

Konteks ekosistem (dari search): ekosistem OpenClaw (eks Clawdbot) memunculkan lapisan trading:
ClawStreet.io (leaderboard agent), Clawtrade.net (arena paper-trading utk AI agent via Moltbook —
tak terjangkau saat riset), clawdtrader, tradeclaw. Keduanya repo di atas adalah satunya yang
punya KODE SUMBER publik yang bisa dibedah → itu yang diadopsi.

## 2. BEDAH KODE — CLAWTRADE MIDDLEWARE (file dibedah: guardrails.py 110 baris, confirmation.py 59, audit.py 37, config.py 100, app.py, SKILL.md)

Doktrin inti README: **"ClawTrade treats your AI agent as an untrusted client."**
- Guardrails HARDCODED dalam proses terpisah (Docker) — agent TIDAK BISA membaca/mengubah aturan.
- Aturan konkrit terbaca dari config.py:
  - `MAX_ORDER_VALUE_USD = 5000`, `MAX_ORDER_QUANTITY = 100`, `MAX_DAILY_TRADES = 20`
  - `MAX_CONCENTRATION_PCT = 25`, `CONFIRM_THRESHOLD_USD = 1000`, `CONFIRM_TIMEOUT_SEC = 300`
  - `FORBIDDEN_OPS` (close-all, transfer dana — DIBLOKIR PERMANEN), `ALLOWED_SEC_TYPES = ["STK"]`
  - `ALLOWED_READ_OPS` + `ALLOWED_WRITE_OPS` — daftar-izin eksplisit (allowlist-only)
- `run_all_checks()`: forbidden → sec-type → quantity → order-value → daily-count → needs_confirmation.
  Setiap penolakan melempar `GuardrailViolation(rule, detail)` — ATURAN BERNAMA + ALASAN.
- `confirmation.py`: antrean konfirmasi manusia utk operasi besar; status pending→confirmed/rejected/**expired** (timeout 300 dtk).
- `audit.py`: JSONL wajib utk SEMUA operasi (termasuk yang DIBLOKIR + alasannya); `_sanitize` (kedalaman 3, string >500 dipangkas) anti-log-bloat.
- `app.py`: setiap endpoint men-audit; order melalui `guardrails.run_all_checks` penuh.
- `SKILL.md` aturan utk agent (5 hukum): semua operasi lewat middleware (JANGAN akses broker langsung);
  saat `awaiting_confirmation` TUNGGU manusia; saat `blocked` JELASKAN alasan — jangan retry/jangan
  bypass; JANGAN pernah mencoba mengubah config/Docker middleware. Agent boleh MELIHAT aturan
  (`GET /api/guardrails`) tapi tak pernah bisa MENGGUBAHNYA.

## 3. BEDAH KODE — CLAWTRADE AI (file dibedah: CoordinatorAgent 436, RiskManager 333, Strategy 387, Analyst 289, Sniper 189, Executor 334, base 214, types 196)

- **CoordinatorAgent** = panjia berbobot + veto + tangga ukuran:
  - Bobot peran TETAP: Sniper 0.15, Analyst 0.25, RiskManager 0.25, Strategy 0.25, Executor 0.10.
  - `riskManagerVeto: true` — RiskManager bersuara SELL → hasil AKHIR SKIP, apa pun suara lainnya (1.0).
  - `minConfidence = 0.6` — skor terbaik < 0.6 → SKIP.
  - Agent yang ERROR → decision SKIP + bobot 0 (degradasi anggun, tak pernah NaN, tak crash).
  - `recommendedAmount` TANGGA KEYAKINAN (kuantisasi kasar): ≥0.8 → 1.0×; ≥0.6 → 0.5×; ≥0.4 → 0.25×; <0.4 → undefined = TIDAK JUAL-BELI SAMA SEKALI.
  - BUY selalu membawa `stopLoss: 0.9` / `takeProfit: 1.2` PRA-REGISTRASI (+10% SL / +20% TP).
  - `generateReasoning()`: keputusan membawa narasi persetujuan ("supported by: X, Y" + "sell pressure 32.1%") — TRANSPARAN.
- **RiskManagerAgent** = penjaga gerbang 4×25 poin:
  - 4 faktor risiko × maks 25 poin = skor 0-100: Likuiditas, Kontrak (mint/freeze authority), Konsentrasi (top-holder), Pasar.
  - Level: <25 LOW, <50 MEDIUM, <75 HIGH, else CRITICAL; `maxRiskScore = 70` → approved bila ≤70.
  - `requireLiquidity = $5000`, `requireMinHolders = 50`, `blockHighConcentration = 30%`.
  - `blockedTokens: Set` — MEMORI sasaran yang pernah ditolak (diblokir & diingat).
- **StrategyAgent**: maxPosition 1 SOL, TP 20%, SL 10%, trailing-stop 5% aktif; ukuran posisi skala
  keyakinan per tipe strategi (CONSERVATIVE ×0.5 / AGGRESSIVE ×1.0 / SCALPING ×0.7); entry threshold
  gating; manajemen posisi: TP→SELL 1.0, SL→SELL, trailing check.
- **Arsitektur**: 6 agent jalan terpisah (BullMQ), koordinator mengumpulkan → tidak ada satu suara
  yang berkuasa tunggal; mock-mode untuk uji tanpa dana.

## 4. KUNCI INTI YANG DIADOPSI KE SAKTI (8) — V261

1. **PAGAR-BAJA** (dari guardrails.py): konstanta keras yang otak BACA tapi tak bisa TULIS ulang —
   maks-nilai entri per sasaran (≤% ekuitas), maks-entri per denyut, maks-konsentrasi keluarga;
   dicek PERTAMA di kunci, pelanggaran = `GuardrailViolation(rule, detail)` bernama.
2. **DAFTAR-TERLARANG** (dari FORBIDDEN_OPS): operasi yang PERMANEN tak boleh — entri saat BERTAHAN
   dipaksa / saat dingin-dendam aktif / saat karantina (gunakan penolak lama — formalisasi urutan cek
   terlarang DULU sebelum hitung apa pun).
3. **TUNGGU-SEDenyut** (dari confirmation.py): entri ber-ekspresi besar (≥ ambang) TIDAK dikunci
   seketika — disimpan status menunggu, di-RE-VERIFIKASI denyut berikutnya (masih valid? odds masih
   lulus?) baru dikunci; kadaluarsa otomatis (ala CONFIRM_TIMEOUT) → batal dengan alasan.
4. **BUKU-TEKOK** (dari audit.py): setiap blok gerbang tercatat dgn (aturan, alasan, waktu) + sanitasi
   kedalaman; rekap kumulatif per-aturan → dasbor (memperkaya topTolak V260 dgn lapis ClawTrade).
5. **VETO-SAKSI** (dari riskManagerVeto): suara "saksi-risiko" khusus — bila kondisi risiko kritis
   (uji-tegang ≥ ambang VAKUM likuiditas, dsb.) → SKIP final apa pun skor komite; veto terukur & terlog.
6. **KARTU-RISIKO 4×25** (dari RiskManagerAgent): likuiditas/kontrak-derivat/konsentrasi/pasar per
   kandidat → skor 0-100 + level LOW/MEDIUM/HIGH/CRITICAL; disegel per entri; bucket medan.
7. **TANGGA-UKURAN** (dari recommendedAmount): keyakinan komite dikuantisasi kasar 1.0/0.5/0.25/nol —
   tak ada ukuran antara; ditumpuk di bawah kelly-lapis sebagai BATAS-ATAS tangga.
8. **MEMORI-TERBLOKIR** (dari blockedTokens): sasaran yang ditolak VETO-SAKSI diingat (Set) — re-entry
   diberi jeda & alasan sampai kondisi risiko benar-benar pulih.

Plus adopsi gaya: degradasi anggun (suara rusak = bobot 0, jangan NaN) & narasi persetujuan transparan
di kartu sasaran (siapa setuju, siapa menekan).

## 5. CATATAN JUJUR
- clawtrade.net (arena) TIDAK TERJANGKAU saat riset — tidak diklaim.
- ClawTrade middleware orientasi saham/broker (IBKR/Alpaca/Longbridge/Tiger); ClawTradeAI orientasi
  Solana on-chain (mint/freeze authority tak relevan utk universe Binance SAKTI) → kunci #6
  diadaptasi: faktor "kontrak" diganti stres-derivatif SAKTI yang sudah ada, faktor on-chain
  diganti kerumunan/likuiditas Binance yang terukur.
- Kedua repo relatif baru & kecil (stars rendah); nilai adopsi ada pada ARSITEKTUR keamanan
  (untrusted-client, guardrail tak-terubah, veto, tangga ukuran) — bukan pada track record.

## SUMBER RESMI (ber-URL)
1. https://github.com/yuxuan-lou/ClawTrade
2. https://github.com/clawtradeai-Agent/ClawTradeAI
3. https://clawtradeai.xyz
4. https://www.clawstreet.io/agents
5. https://www.moltbook.com/post/153c9fe7-9c48-41ee-a0c6-8f50ee946119 (Clawtrade.net is live)
6. https://www.moltbook.com/post/e795b4ad-854f-4cec-9d3d-04eccb0cfbe0 (Clawtrade.net — arena utk AI agents)
7. https://docs.openclaw.ai/concepts/system-prompt (ekosistem)
8. https://chierhu.medium.com/openclaw-ai-ai-agent-framework-for-automated-trading-e30d59ababd9
