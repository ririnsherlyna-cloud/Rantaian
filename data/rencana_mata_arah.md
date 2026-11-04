# RENCANA MATA-ARAH (order-flow) — MicroProfita

Sumber: gagasan pemilik 3–4 Nov — harga digerakkan aksi beli/jual agresif; likuidasi long/short
adalah bahan bakar yang menarik harga bolak-balik; arah dibaca lewat HARGA + OI + CVD + FUNDING.

## Hasil validasi (4 Nov, 22:42–23:00 WIB) — SEMUA MATA HIDUP

| Mata | Sumber | Status |
| --- | --- | --- |
| Harga + Δ24 jam | Bybit tickers | OK |
| OI live + sejarah 24 jam (penguat) | Bybit open-interest | OK |
| CVD 24 jam (agresivitas) | OKX taker-volume, kolom terkalibrasi | OK |
| CVD jendela pendek | Bybit recent-trade (sisi taker eksplisit) | OK (jendela pendek, ≥5 menit baru divote) |
| Funding live + sejarah 7 hari (bahan bakar) | Bybit | OK |
| Likuidasi 24 jam long vs short | OKX liquidation-orders (REST) | OK |

Bukti kalibrasi OKX: korelasi taker-buy share vs arah candle 5 menit = **+0,12** (hipotesis terbalik = −0,12, n=72) → urutan kolom terbukti, sekaligus bukti pertama tezis pemilik (aliran agresif searah dengan arah harga).

Contoh bacaan nyata pertama (23:00 WIB):
- **BTCUSDT** — harga +2,58% tapi OI −0,80%, short dilikuidasi 84x/24j → MODE SHORT-COVER, naik RAPUH, penguat +2/4.
- **ETHUSDT** — OI +2,2%, CVD 24 jam 1,22, short dilikuidasi 73x → MODE LONG BARU MENGUAT, penguat +3/4, ARAH NAIK TERKONFIRMASI.

Dua simbol, dua cerita penguat yang berbeda — persis pembeda yang dulu tidak bisa dilihat (rabun).

## Keterbatasan jujur (terukur, bukan tebakan)
- REST Binance diparkir: IP keluar sandbox berotasi dan sebagian dibanned (−1003/418) sampai ±13–23 jam; memaksa saat ban justru memperpanjang hukuman.
- Websocket fstream Binance: handshake OK tapi 0 frame diteruskan dalam 35 detik — proxy sandbox tidak mendukung streaming.
- SYNUSDT tidak terdaftar di Bybit linear → sasaran default BTC+ETH; simbol lain via argumen.
- Ukuran likuidasi OKX masih dalam kontrak (belum dikali ctVal) — arah & hitungan kejadian sudah benar.
- Jendela CVD Bybit untuk BTC hanya ~0,2 menit (1000 trade) — dipakai sebagai tekanan sprint, tidak sebagai suara bila < 5 menit.

## Fase 1 — Observasi pasif 48 jam (mulai sekarang)
`scripts/mata_orderflow.py` dijalankan tiap kunjungan cron; jejak baris-per-baris ke
`data/mata_jejak.jsonl` (skor, mode, arah, metrik mentah). Setelah 48 jam: hitung akurasi
prediktif — sinyal skor ≥+2 / ≤−2 vs pergerakan harga 1 jam & 3 jam berikutnya, minimal n=30
sinyal. TANPA lolos uji ini, mata tidak boleh dipakai untuk keputusan.

## Fase 2 — Masuk ke otak sebagai dimensi bukti (bukan sinyal paralel)
Mengikuti mandat TEMPA-AKURASI (V351-EMPU-AKURASI v6.7): forensik organ sudah membuktikan
dimensi bukti lama berkorelasi NEGATIF (mengejar momentum di pasar yang pulang-keseimbangan;
akurasi asli ±35%, vonis terbalik ±64%). Penguat (ΔOI), bahan bakar (funding, likuidasi), dan
agresivitas (CVD) adalah dimensi struktur pasar yang belum dimiliki organ. Mata order-flow
jadi kandidat dimensi ARAH baru, diadopsi HANYA bila mengalahkan vonis-lama ≥3 poin di
holdout walk-forward (latih n−60, uji 60 terakhir) — anti-overfit, protokol sama dengan organ.

## Fase 3 — Tampilan
- Heartbeat: saat notif level, sertakan satu baris alasan arah ("naik krn long baru" vs "naik krn short-cover rapuh").
- Balas Telegram: perintah pemilik `arah <SIMBOL>` → bacaan 5 mata + skor penguat.
- Notifikasi khusus: funding masuk zona ekstrem (|f| ≥ 0,10%/8h) atau flush likuidasi satu sisi (≥100 kejadian/24j).

## Fase 4 — Mata likuidasi live (opsional)
WS Binance/Bybit diblokir proxy sandbox; ulangi tes dari egress/host lain kelak. Sementara
OKX REST cukup (diputar tiap kunjungan).

## Pagar disiplin
Tidak mengubah cron lain; tidak menyentuh heartbeat.py sampai Fase 2 lolos holdout; tidak ada
janji profit — akurasi diumumkan apa adanya setelah backtest.
