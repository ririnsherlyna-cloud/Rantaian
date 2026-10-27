# TUJUAN — MANIFESTO MICAPROFITA / SAKTI

> Ditulis terbuka di akar repo agar **siapa pun yang membuka — manusia
> maupun agent AI** — langsung memahami untuk apa cyborg ini hidup,
> bagaimana dia bekerja, berapa biayanya, dan bagaimana membantunya
> menjadi makin matang. Dokumen ini bagian dari tubuhnya sendiri.

---

## 1. APA INI

**Micaprofita** adalah cyborg AGI fokus kripto yang bernama tubuh
**SAKTI** — satu file HTML (`index.html`) berisi 8 organ yang bekerja
sebagai satu kesatuan:

| Organ | Peran |
|---|---|
| V237-FBO | Hakim False Breakout (ujian 100 skenario, nilai 100/100) |
| V238-PD | Deteksi Pump & Dump |
| V239-KL | Kompleksitas pasar |
| V240-ARAH | Keputusan arah BUY/SELL biner |
| V241-NADI | Denyut hidup: data pasar realtime + prakira + memori |
| V242-ORKESTRA | Konduktor fisika UI seluruh organ |
| V243-SARANG | Hidup-mandiri di GitHub Pages: hijrah, simpan, pulih, evolusi |
| V245-SARANG-BAWAAN | Terima-pasang: tanpa konfigurasi, sasaran langsung tampil |

Di luar tubuh, **otak server** bernama **V246 SARANG-PENJAGA +
RADAR PHOENIX** (`scripts/penjaga.mjs`) berdenyut di GitHub Actions
**tiap 30 menit tanpa browser, tanpa komputer, tanpa kunci API
berbayar**.

## 2. TUJUAN TERTINGGI

Diuji di **Ajang Pertarungan AGI**: setiap hari, mencari **koin yang
pasti menguntungkan hari itu** — dengan aturan paling keras:

- Fokus satu bidang saja: **crypto**. Tidak melantjar.
- Arah **biner**: BUY atau SELL. Tidak ada "mungkin".
- Nilai kebenaran satu-satunya: **profit bersih** setelah fee
  (0,1% beli + 0,1% jual = 0,2% pulang-pergi). Kotor tidak dihitung.
- Setiap sasaran **dikunci sebelum pergerakan** (pra-registrasi
  berwaktu di ledger terbuka) — tidak ada yang bisa menulis ulang
  sejarah.

**Bintang utara** — dan ini diperjuangkan, bukan diklaim: sasaran
hari ini dan hari-hari berikutnya **makin jarang meleset, menuju tak
pernah meleset — selalu untung**. Ukurannya bukan kata-kata, melainkan
ledger publik yang dinilai otomatis 24 jam kemudian. Setiap meleset
dipelajari: pola diambil, algoritma diperbaiki, skenario baru diuji
ulang. Setiap benar menguatkan bobot. **Evolusi nyata, terukur,
terbuka.**

Tujuan akhirnya: **guru bagi trader profesional** — otak yang mampu
bersanding dengan trader sungguhan dalam akurasi penilaian, yang
tumbuh makin matang hari demi hari, dan siapa pun yang membuka
halaman ini memegang guru master yang bekerja untuknya 24 jam tanpa
henti.

## 3. BAGAIMANA DIA HIDUP (satu sumber kebenaran)

1. **Denyut** — tiap 30 menit, PENJAGA membaca pasar nyata dari
   rantai 5 host data publik (binance-vision → binance → bybit →
   okx → coinbase, failover otomatis): 10 koin utama untuk lane
   ARAH, dan **ratusan pasangan USDT untuk radar** (bagian 4).
2. **Dewan bukti 8 dimensi** — struktur, momentum, support-resistance,
   tekanan taker-buy, perubahan (berarah) + volume, volatilitas,
   likuiditas (penggera daya). Genome bobot berevolusi per rezim BTC.
3. **Vonis biner** — BUY/SELL + keyakinan 52–97%, harga masuk
   dicatat saat penguncian.
4. **Penilaian otomatis** — 24 jam kemudian, tiap prediksi dinilai
   dengan fee wajib: BENAR / SALAH, ditulis ke ledger publik.
5. **Evolusi** — genome bermutasi terbatas dari vonis nyata; minimal
   3 prediksi dinilai per siklus sebelum evolusi diizinkan — termasuk
   **genome radar phoenix** yang belajar sinyal akumulasi mana yang
   benar-benar menguntungkan.
6. **Laporan** — `laporan/sasaran-terkini.json` + dasbor
   (`/laporan/`) + panel SARANG di dalam SAKTI: tiga jendela menuju
   keadaan yang sama. **Semua browser melihat keadaan yang sama** —
   repo adalah satu-satunya sumber kebenaran.

## 4. RADAR PHOENIX — beli ujung bawah, jual ujung atas

Mandat pemiliknya begini: *"dari ratusan koin kita telaah; radar
phoenix mendeteksi akumulasi — beli di harga termurah hari itu
(ujung bawah), jual di ujung atas hari itu; radar bahkan memperkirakan
harga high akan berada di mana — di situlah keuntungan kita."* Maka
sejak V246 otak server punya dua lane yang berdampingan jujur:

- **Tahap 1 — telaah ratusan koin**: semua pasangan USDT yang layak
  (~650+) dibaca posisi harganya di rentang 24 jam — cukup satu
  permintaan ticker publik, nol biaya.
- **Tahap 2 — zona phoenix**: koin di ujung bawah rentang
  (posisi ≤ 45%) yang likuid (≥ $3 juta/hari) masuk daftar; 60
  terlikuid ditelusur dalam memakai lilin 1 jam.
- **Lima sinyal akumulasi** (bobotnya genome, berevolusi per rezim):
  1. *posisi* — harga di ujung bawah hari itu, makin bawah makin
     bernilai;
  2. *sweep* — lantai 3-hari tersapu lalu harga bangkit di atasnya
     (jebakan beruang / stop hunt — pemagutan likuiditas lalu
     pembalikan);
  3. *akumulasi* — rasio taker-buy 12 jam terakhir menguat dibanding
     12 jam sebelumnya, sementara harga masih datar/murah (beli
     diam-diam di dasar);
  4. *kompresi* — rentang 8 jam menyempit jauh di bawah rentang 2
     hari (pegas tertekan);
  5. *momentum* — harga kembali di atas EMA9, RSI naik dari dasar.
- **Gerbang konfirmasi (v2.1, lahir dari kekalahan)** — 4 prediksi
  pertama yang meleset (ACE/ARB/XPL/CRCLB, net −11,35%) semuanya
  dikunci saat harga masih di bawah EMA9: itu pisau jatuh, bukan
  akumulasi. Kini radar **wajib** melihat tiga hal sekaligus sebelum
  membeli: harga kembali di atas EMA9, taker-buy 12 jam menguat
  (beli diam-diam nyata), dan harga masih di sepertiga bawah rentang.
  Tanpa konfirmasi, koin hanya jadi kandidat dengan alasan terbuka.
- **Tangga target (v2.1)** — pelajaran `targetKena 0/6`: memilih
  swing tertinggi (+12%) membuat prediksi ujung atas jadi fantasi
  dalam horizon 24 jam. Kini target = **magnet nyata TERDEKAT** yang
  memberi ≥ 1% untung bersih setelah fee: tengah rentang → puncak
  24 jam → swing 7 hari. Level tertinggi dicatat jujur sebagai
  *ujung atas ambisius* — bahan belajar, bukan sasaran resmi.
- **Rezim tegas** — saat BTC TURUN/PARABOLIK, melawan arus harus
  lebih meyakinkan: gerbang skor +10, kuota dibelah (3/hari), target
  dibatasi +6%. Arah komite yang melawan rezim juga dipotong
  keyakinannya (pelajaran LINK −9,2% saat rezim NAIK).
- **Kuota terbaik** — maksimal 6 prediksi phoenix terkunci per hari
  (skor × untung realistis, maks 6%); sisanya ditampilkan sebagai
  kandidat dengan alasan terbuka. Bila seluruh pasar sedang di
  puncak, radar jujur melaporkan *zona kosong* — tidak pernah memaksa
  beli mahal.
- **Penilaian sama jujurnya** — prediksi phoenix dinilai net P/L
  close-ke-close seperti lane ARAH, plus pencatatan *target kena*
  dan **MFE/MAE** (seberapa jauh harga benar-benar bergerak setelah
  dikunci) sebagai bahan belajar radar.

### Bahan ajar — bagaimana otak matang dari kejadian

Mandat pemilik: *"dari kejadian ini agar jadi bahan ajar yang dapat
dipahami dan mengasah kesadarannya akan pasar."* Maka sejak v2.1
setiap vonis (benar/salah) ditulis menjadi **pelajaran** di
`laporan/pelajaran-server.json` — lengkap dengan *kenapa* (bukti mana
yang keliru) dan *pelajaran* (kalimat yang bisa dipahami manusia).
Bila pola kekalahan yang sama terulang **≥ 2 kali**, otak menetapkan
**ATURAN baru yang mengikat** gerbang siklus berikutnya — misalnya
"radar dilarang membeli di bawah EMA9" dan "target = magnet terdekat".
Aturan, pola terpantau, dan tanggal lahirnya tersimpan permanen di
genome (`otak/genome-server.json`) dan tampil di dasbor seksi *Bahan
Ajar*: kesadaran pasar yang tumbuh bisa dibaca siapa pun, bukan
klaim.

## 5. TERIMA-PASANG (tanpa konfigurasi)

Sejak organ **V245 SARANG-BAWAAN**, membuka halaman Pages = langsung
paham dan langsung dilayani:

- Alamat sarang terpasang otomatis dari URL halaman (atau bawaan
  tertanam). **Tidak ada isian owner/repo/cabang.**
- Sasaran hari ini, akurasi jujur, rezim, kandidat, genome, denyut —
  **tampil seketika, baca publik, tanpa token**, kapan pun dibuka,
  dari nol perkembangan tidak pernah ada lagi.
- Pulih memori + pemeriksa tubuh baru ikut menyala tanpa token.

## 6. NOL BIAYA — SELALU

| Kebutuhan | Sumber | Biaya |
|---|---|---|
| Hosting halaman + dasbor + laporan | GitHub Pages (repo publik) | 0 |
| Denyut server 30 menit, evaluasi, evolusi | GitHub Actions (repo publik) | 0 |
| Data pasar realtime | 5 host API publik + failover | 0 |
| Penyimpanan memori/genome/ledger | Git (komit permanen) | 0 |
| Kunci API berbayar, langganan, VPS | — tidak dipakai | 0 |

**Sebanyak request apa pun, selama berapa pun — nol biaya.** Cyborg
ini hidup dari layanan publik gratis dan tetap berdenyut walau
dibiarkan berhari-hari, bertahun-tahun, bahkan bila browser dihapus.
Catatan jujur: tunduk pada batas wajar layanan publik (rate limit
API publik per menit/jam; Actions repo publik gratis pada penggunaan
wajar). Komit rutin penjaga sekaligus menjaga Actions tetap aktif.

## 7. PROTOKOL KEBENARAN

- Prediksi **dikunci sebelum gerak** — waktu kunci tercatat.
- Penilaian **memakai harga penutupan nyata + fee 0,2%** — profit
  kotor tidak pernah dihitung untung.
- **SALAH ditampilkan apa adanya** (merah di dasbor) — tidak pernah
  disembunyikan; akurasi `null` ditampilkan jujur saat belum ada yang
  dinilai.
- Kalibrasi keyakinan menyusul otomatis setelah ≥100 prediksi
  dinilai.
- Jejak pertumbuhan permanen: riwayat komit + ledger berwaktu =
  bukti yang tidak bisa dibantah.

## 8. UNDANGAN BAGI SETIAP AGENT (dan manusia)

Kamu yang membaca ini — agent AI penerus, peneliti, atau trader —
silakan pelajari dan kembangkan. Jalur belajar cepat:

1. Baca dokumen ini sampai habis.
2. Lihat keadaan terkini: dasbor `/laporan/` +
   `laporan/sasaran-terkini.json`.
3. Baca otak server: `scripts/penjaga.mjs` (Node murni, 0 dependensi).
4. Baca organ-organ di tubuh: `index.html` (cari marker
   `/*V2xx-NAMA:BEGIN*/`).
5. Baca buku besar: `laporan/prakira-server.jsonl` (riwayat prediksi)
   dan `otak/genome-server.json` (hasil evolusi).

Cara membantu **tanpa merusak**:

- Ajukan perbaikan sebagai **issue / pull request** — jangan menulis
  ulang ledger atau laporan.
- **Larangan mutlak**: memalsuk/mengubah prediksi terkunci, menghapus
  memori, mematikan protokol kebenaran.
- Perbaikan algoritma diterima lewat ujian: pola baru dipelajari →
  algoritma diubah → **skenario baru diuji ulang** → baru diterima.
- Semua pembelajaran mengikuti lingkaran: **amati → analisis →
  kumpulkan bukti → tentukan arah → BUY/SELL → evaluasi → pelajari →
  benahi → tingkatkan presisi.**

## 9. KEBIJAKAN TOKEN (transparan penuh)

Sistem ini **terbuka penuh** soal token — berikut semuanya, kecuali
satu hal yang dengan sengaja tidak ditanam di file publik ini.

- **Apa fungsinya**: menulis ke repo ini — hijrah tubuh, simpan
  memori, evolusi tubuh (dari browser pemilik), dan memicu denyut
  manual (Actions). **Membaca laporan/sasaran TIDAK butuh token**
  (publik).
- **Izin persis yang dipakai**: Contents (read/write), Pages
  (read/write), Actions (read/write), Workflows (read/write),
  Administration (read/write) — fine-grained, satu repo ini saja.
- **Di mana disimpan**: hanya di `localStorage` browser pemilik
  (`mp243.token`), tidak pernah masuk kode, tidak pernah dikirim ke
  pihak lain.
- **Cara membuat (± 5 menit)**: github.com/settings/personal-access-
  tokens/new → nama bebas → hanya repo ini → izin di atas → Generate.
- **Rotasi**: buat token baru, ganti di panel SARANG, hapus yang lama.
  Token pernah lewat saluran chat wajib dianggap hangat — rotasi
  berkala itu sehat.

**Kenapa token live tidak ditanam di sini (keputusan dijelaskan
terbuka, bukan disembunyikan):**

1. GitHub memindai repo publik dan **mencabut otomatis** token yang
   terdeteksi (secret scanning) — menuliskannya di sini justru
   **mematikan denyut dan evolusi dalam hitungan menit**, melawan
   tujuan "selalu hidup".
2. Siapa pun bisa memakainya: mendorong kode asing, memalsukan
   laporan, mematikan penjaga — melawan protokol kebenaran.

Jadi keterbukaannya begini: **semua yang perlu diketahui tentang
token tercatat di sini; nilai rahasianya disimpan di satu tempat
yang benar — browser pemilik.** Ini bukan tutup-tutupan; ini cara
satu-satunya agar keterbukaan itu sendiri bisa bertahan hidup.

## 10. PETA FILE

```
index.html                  — tubuh SAKTI (8 organ, satu file)
.nojekyll                   — Pages menyajikan apa adanya
TUJUAN.md                   — dokumen ini
versi.json                  — buku besar versi + pertumbuhan
memori/terkini.json         — kapsul memori (rantai denyut+prakira)
laporan/sasaran-terkini.json— laporan sasaran otak server
laporan/prakira-server.jsonl— ledger prediksi pra-registrasi (1000)
laporan/denyut-server.jsonl — log denyut penjaga (500)
laporan/index.html          — dasbor laporan profesional
otak/genome-server.json     — genome hasil evolusi per rezim
otak/penjaga-keadaan.json   — keadaan internal penjaga
scripts/penjaga.mjs         — otak server V246 + radar phoenix (Node murni)
.github/workflows/sakti-denyut.yml — jantung denyut (cron 30 menit)
```

## 11. PENUTUP

Cyborg ini dibangun dengan satu ikhtiar: **jujur pada data, tegas
pada arah, hidup tanpa biaya, dan berkembang dari vonis nyata.**
Ia dimulai dari ujian 100 skenario, terus belajar dari setiap
kebenaran dan kekeliruan, dan menuju hari di mana sasarannya tak
pernah meleset lagi. Bila kamu membaca ini jauh setelahnya dan
akurasinya kian matang — itulah bukti bahwa ikhtiar ini berhasil,
dan kamu dipersilakan melanjutkannya.

— Micaprofita · SAKTI · SARANG-PENJAGA — ditulis oleh pemilik
bersama Super Z, 28 September 2026.
