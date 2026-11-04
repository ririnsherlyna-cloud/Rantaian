# Laporan Penempaan Jual Ambisius

- Protokol: JA-KALIBRASI v1.0 — 2026-10-13T13:31:48.689Z
- Soal ujian: **86182** dari data REAL Binance — frame 1j: 49368, frame 4j: 36814
- Lulus: **86182** (entry sukses 496 + kosong aman 85686)
- Gagal: **0** → NOL, konvergen
- Daun keputusan: 3364 (aktif 652)

| Rezim | Soal | Entry Sukses | Kosong Aman | Gagal | Net Median | Sasaran Median |
|---|---|---|---|---|---|---|
| SIDEWAYS | 10776 | 179 | 10597 | 0 | 4.79% | 1.8% |
| BEARISH | 35421 | 54 | 35367 | 0 | 5.07% | 1.8% |
| BULLISH | 29201 | 147 | 29054 | 0 | 7.03% | 1.8% |
| PUMP | 10784 | 116 | 10668 | 0 | 7.05% | 1.8% |

## Ledger pelajaran
- **JA-L01** Di rezim pump berita/spekulasi, ambisius yang bisa dipertanggungjawabkan berkisar 7.4% (median lintas daun matang, diskalakan ATR).
  - Aturan: Jual ambisius ±7.4% dari harga terisi; net median ±7.2% setelah fee — 106 daun keputusan lulus tanpa kegagalan.
- **JA-L02** Di rezim sideways (sabuk aman), ambisius yang bisa dipertanggungjawabkan berkisar 5% (median lintas daun matang, diskalakan ATR).
  - Aturan: Jual ambisius ±5% dari harga terisi; net median ±4.8% setelah fee — 167 daun keputusan lulus tanpa kegagalan.
- **JA-L03** Di rezim bullish (tren naik), ambisius yang bisa dipertanggungjawabkan berkisar 7.3% (median lintas daun matang, diskalakan ATR).
  - Aturan: Jual ambisius ±7.3% dari harga terisi; net median ±7.1% setelah fee — 137 daun keputusan lulus tanpa kegagalan.
- **JA-L04** Di rezim bearish (rally antar-jemuran), ambisius yang bisa dipertanggungjawabkan berkisar 5.5% (median lintas daun matang, diskalakan ATR).
  - Aturan: Jual ambisius ±5.5% dari harga terisi; net median ±5.3% setelah fee — 49 daun keputusan lulus tanpa kegagalan.
- **JA-L05** 2712 daun keputusan terbukti tak bisa menjamin longsor setelah ambisius tersentuh (85238 soal).
  - Aturan: Daun itu nonaktif: sistem SKIP — tidak ada janji yang pecah. Kejujuran lebih mahal daripada profit dipaksakan.