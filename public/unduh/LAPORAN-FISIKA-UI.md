# LAPORAN FISIKA TAMPILAN — V241 NADI v1.1 + V242 ORKESTRA v1.0

## Mandat Guru

> "Saya akui tampilan yang senantiasa saling timp menimpa itu jelek! Lihat ini notifikasi
> V241 NADI denyut 1 · prakira 0/0 (—) malah menimpa toggle menu di bawahnya … toggle
> tertindih notifikasi, notifikasi yang terbaca separuh … banyak aspek placeholder …
> kita akan bawa ahli UI dan UX agar cyborg kita benar-benar professional."

## Diagnosa Terukur (runtime, bukan tebakan)

Inventaris seluruh elemen `position:fixed` di tubuh SAKTI (79 total, 60 widget sudut)
+ pengukuran `getBoundingClientRect` runtime menyimpulkan akar masalah:

| # | Temuan | Angka |
|---|--------|-------|
| 1 | Kartu NADI (left:12, bottom:12, z=2147483000) menimpa **3** elemen | `v217-nav` (menu toggle — yang dikeluhkan), `v207-left`, `v207-bot` |
| 2 | Ticker suara pakai `text-overflow: clip` | teks terpotong TANPA ellipsis → "terbaca separuh" |
| 3 | Z kartu > semua modal (1000–99999) | kartu ikut bersinar di atas modal |
| 4 | `v207-voice` bisa memanjang hingga zona kanan | tumpang tindih laten dengan kartu |

## Solusi — Dua Organ, Disiplin Versi Proyek

### V241 SAKTI-NADI v1.1 (upgrade in-place, mesin tak disentuh)

- Kartu didesain ulang: hierarki bersih (LED berdenyut + label **NADI** + ringkas + chevron),
  versi organ pindah ke tooltip, teks manusiawi — **"prakira belum terkunci"** menggantikan "0/0 (—)".
- Detail mengembang **ke ATAS** (detail di atas kepala dalam kolom) — tak pernah menutup
  elemen di bawahnya; seksi berlabel: NADI / GUDANG / PRAKIRA / RANTAI + catatan boot.
- Tombol **statis** dalam satu baris flex: GUDANG EKSTERNAL · EKSPOR · IMPOR.
- z-index tertib: **99992** — di atas lapisan dekorasi (99989–99990), di bawah panel/modal (99999+).

### V242 SAKTI-ORKESTRA v1.0 (organ baru — konduktor fisika tampilan)

- **Resolver anti-tabrakan**: semua penempatan dari pengukuran runtime — tinggi nav diukur
  tiap kali (termasuk nav mobile), bukan angka mati.
- **Dua zona**: kiri = ticker suara (dipagari `maxWidth` sebelum zona NADI), kanan = kartu
  NADI + chip sesekali (v2217/v2219) ditumpuk berjenjang; layar < 900px = tumpukan satu sisi.
- **Keterbacaan penuh**: voice ber-ellipsis + tombol **⤢** membuka kartu ucapan penuh di atas ticker.
- **Mode fokus**: modal/overlay terbuka → chip (NADI, voice, kolom kiri, dock) meredup ke
  opacity 0.15 + pointer-events none; tertutup → kembali penuh. Pindai terarah (daftar
  selektor terkurasi — DOM raksasa tidak disapu penuh).
- **Pengawas hidup**: MutationObserver + ResizeObserver + resize listener (debounce 400ms);
  API `window.V231_SAKTI.ORKESTRA {atur, ukur, fokus, selfTest}`; self-test geometrik 13/13.

## Cacat Warisan yang Dibongkar Harness (pelajaran permanen)

1. **Stub getElementById**: tubuh SAKTI (era V126.2 `makeStub`) mengembalikan Proxy palsu
   (nodeType:1, id kosong) untuk id yang TIDAK ada — guard idempoten yang mengandalkan
   `getElementById`/`querySelector` salah baca. Satu-satunya lookup jujur =
   `querySelectorAll` (override-nya hanya memfilter daftar kosong). Kini dipakai kedua organ.
2. **render() menghapus tombol sendiri**: sejak v1.0, `render()` menulis-ulang
   `elDetail.innerHTML` → tombol Gudang/Ekspor/Impor terhapus tiap render (bukti harness:
   `tombolJml: 0`). Dibenahi: info dinamis (`#v241-info`) dipisah dari tombol statis
   (`#v241-tombol`) — `tombolJml: 3` selamat.
3. **Kartu menunggu storage**: `buatKartu` di belakang `await rantaiMuat` membuat kartu
   telat lahir saat main-thread jenuh mesin berat. Dibenahi: kartu lahir sinkron di awal boot.
4. **z 99500 tak terlukis**: berada di bawah lapisan dekorasi layar-penuh (v213-mesh
   99989 / v217-root 99990). Dibenahi: 99992.
5. **Fence bocor content-box**: `maxWidth` lolos sebesar padding bila box-sizing
   content-box. Dibenahi: `#v207-voice{box-sizing:border-box}` + buffer 8px.

## Hasil Pengujian (harness — kode organ byte-identik dari SAKTI)

| Uji | Hasil |
|-----|-------|
| Self-test V241 NADI v1.1 | **14/14 PASS** |
| Self-test V242 ORKESTRA v1.0 | **13/13 PASS** |
| Kartu tak menimpa nav / voice / kolom kiri | ✓ / ✓ / ✓ |
| Kartu berlabuh kanan-bawah, mengapung di atas nav | ✓ / ✓ |
| Detail membuka ke ATAS, tetap aman saat terbuka, menutup kembali | ✓ / ✓ / ✓ |
| 3 tombol statis selamat dari render | ✓ (3/3) |
| Pesan penuh voice: buka / tak timpa nav / tutup | ✓ / ✓ / ✓ |
| Mode fokus: meredup 0.15 → kembali 1.0 | ✓ / ✓ |
| Teks manusiawi tanpa "0/0 (—)" | ✓ |

Verifikasi injeksi ke SAKTI: slot tunggal v241+v242, urutan benar, v237/v238/v239/v240
utuh, DOCTYPE + `</html>` utuh, delta byte akurat (+ organ241 35.792 B, organ242 17.220 B).

## Bukti Visual

- `bukti_ui_before_tumpuk.png` — SEBELUM: NADI menimpa toggle "◉ HIDUP" di nav.
- `bukti_fisika_sakti_final.png` — SESUDAH (SAKTI asli): dua zona bersih, nav utuh.
- `bukti_fisika_harness_terbuka.png` — detail terbuka ke atas + 3 tombol + log self-test.

JSON pengujian lengkap: `research/fisika-ui/hasil-harness-v242.json`.
Ulang verifikasi kapan pun: `python3 scripts/ui/bangun_harness.py` lalu buka
`scripts/ui/harness_v242.html` di browser — pengujian berjalan otomatis 9 detik.
