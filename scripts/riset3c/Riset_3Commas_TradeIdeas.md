# Deep-Screening: 3Commas & Trade Ideas — Kunci Inti & Peta Injeksi ke Micaprofita/SAKTI

Tanggal: 2026-10-01 · Metode: ambil langsung dokumentasi resmi (web search rate-limited 429 → fetch langsung)
Sumber tersimpan: scripts/riset3c/*.txt (hasil konversi halaman resmi)

## SUMBER TERVERIFIKASI (fetched & disimpan)
- https://3commas.io/ (home_3commas.html, 380 KB)
- https://help.3commas.io/en/collections/19714499-trading-bots (docs_3c_bots.html)
- https://help.3commas.io/en/articles/16281102 — How the DCA Bot Works: Strategy & Setup Guide (c3c_dca.html)
- https://help.3commas.io/en/articles/16845742 — DCA Bot: Building Entry Signals with Multiple Built-in Indicators (c3c_entrysig.html)
- https://help.3commas.io/en/articles/16281154 — How Pump Protection Works (c3c_pumpprot.html)
- https://help.3commas.io/en/articles/16281163 — How Trailing Stop Works (c3c_trail2.html)
- https://help.3commas.io/en/articles/16281110 — How Move Stop Loss to Breakeven Works (c3c_breakeven.html)
- https://help.3commas.io/en/articles/16281055 — Global Max Open Positions Settings (c3c_globalmax.html)
- https://help.3commas.io/en/articles/16527454 — Connect your AI assistant to 3Commas MCP (c3c_aimcp.html)
- https://trade-ideas.com/ (home_ti2.html)
- https://trade-ideas.com/features/ai-signals/ (ti_aisignals.html) — Holly AI
- https://trade-ideas.com/ai-strategy-lab/ (ti_ailab.html)
- https://trade-ideas.com/features/money-machine/ (ti_money.html)
- https://trade-ideas.com/features/backtesting/ (ti_backtest.html) — halaman OddsMaker

## KUNCI INTI — 3COMMAS (dari artikel resmi, dikutip)
1. **DCA 6-parameter**: DCA Mode, Averaging Method, Max DCA Orders, Price Deviation,
   Order Size Multiplier, Price Deviation Multiplier — averaging TERKONTROL dgn hard
   cap (Max DCA Orders) & langkah deviasi berkelipatan ("first additional entry at
   1%, second at 2%", deviasi × multiplier).
2. **Entry AND-logic ≤5 indikator, closed candle saja**: "Adding more indicators
   results in fewer but potentially higher-confidence entries"; crossing = trigger,
   level = context ("pair a crossing condition (the trigger) with level conditions
   (the context)").
3. **Exit ladder**: Take Profit (dapat berbasis AVERAGE price) + Stop Loss +
   **Move SL to Breakeven** (aktivasi % → SL pindah ke entry+fee; "eliminate the
   risk of losing money on a trade after breakeven is triggered") +
   **Trailing Stop 2-param** (Activation Price + Trailing distance; "maintaining a
   fixed distance... if the price drops, the stop becomes active").
4. **Pump Protection**: monitor akselerasi harga MELAWAN posisi → halt → resume
   saat volatilitas menurun (memvalidasi guard kejut-pump V249 SAKTI).
5. **Global Max Open Positions**: "controls the maximum number of strategies all
   bots can have open cumulatively... prevent excessive trading".
6. **Backtest 30 hari + Optimize sebelum live**: "runs multiple backtests to find
   the optimal DCA parameters and Take Profit percentage".
7. **AI MCP disiplin-permisi**: read-only key default; "You stay in charge: the
   assistant... always confirms before it touches a live trade".

## KUNCI INTI — TRADE IDEAS (dari situs resmi, dikutip)
8. **Holly AI**: "precision buy/sell signals with entry and exit points in
   real-time"; "manages position sizing and risk parameters, adjusting to changing
   market conditions" (memvalidasi bias konteks Nevron V255).
9. **Money Machine**: "Automatically positions you in the market's **top 3
   momentum opportunities**" — konsentrasi top-3, bukan tersebar tipis.
10. **OddsMaker (backtesting page)**: **event-based testing** — "tests strategies
    triggered by real market events—breakouts, volume spikes, and moving average
    crosses—across thousands of stocks simultaneously"; metrics: "profit factor,
    win rate, average winner/loser, max drawdown"; Strategy Optimization:
    "**Pinpoint winning filters and eliminate losing variables**".
11. **Backtest-first workflow**: "Score trading plans against historical data to
    discover what truly works" — setiap alert backtestable.
12. **Paper trading real-time** sebelum uang nyata (memvalidasi slot eksplorasi +
    sandbox SAKTI).

## YANG SUDAH ADA DI SAKTI (validasi silang, bukan diinjeksi ulang)
- Guard kejut-pump V249 ≈ Pump Protection 3Commas
- Komite AND multi-dimensi ≈ entry AND 3Commas
- Forensik zona racun/emas V252 ≈ OddsMaker "eliminate losing variables"
- Sekolah parameter V254 + slot eksplorasi ≈ backtest/paper-first
- Bias konteks V255 ≈ Holly risk adaptation

## YANG DIINJEKSI → V256-MESIN-DEAL-ODDS
A. **Mesin Deal 3Commas** (pra-registrasi per sasaran, kontingensi disiplin):
   - Safety Orders: maxSO=2 (Max DCA Orders), deviasi langkah = 1.2×ATR24j,
     dev-multiplier ×1.6, volume-multiplier ×1.5 → level + avg-price + TP-dari-avg
   - Move SL to Breakeven: aktivasi di 60% jalan ke target, stop baru = entry+fee
   - Trailing Take Profit: setelah target T1 kena, trail dari peak = 0.8×ATR24j
   - Semuanya DINILAI MEDAN saat horizon matang: SO kena/avg/net-dengan-SO,
     BEP menyelamatkan/ya, trailing ekstra-% — diakumulasi ilmu.deal
B. **Odds Maker ala Trade Ideas**: skor peluang 0-100 per kandidat =
   0.40×peluang-MC + 0.25×hit-rate-zona-medan + 0.20×estimator-metakognisi +
   0.15×daya-produk (zona emas +5) — **top-3 Money Machine** + ambang ≥55;
   semua kandidat diranking, sisanya ditolak dengan alasan odds (nearMiss).
C. **Tag Peristiwa OddsMaker**: 6 peristiwa dari lilin (breakout48j, lonjakVolume,
   crossEMA, pullbackBB, divergensiRSI, searahTren4h) disegel di ledger →
   hit-rate/net per peristiwa dihitung saat matang → laporan "winning filters".
D. **Max Posisi Terbuka global** diukur & dilaporkan (Global Max Open Positions).
