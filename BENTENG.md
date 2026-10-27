# BENTENG MICROPROFITA — Formula & Metode Agahan Anti-Kematian Senyap

> Ditulis 2026-10-27, hasil otopsi "sandbox inactive lagi" + "sandbox reset penuh (12:50 WIB)".
> Hukum dasar: **keheningan = alarm**. Tidak ada kematian yang boleh terjadi tanpa pengakuan.
> Rumah tahan reset dokumen ini: `ririnsherlyna-cloud/Rantaian` (file `BENTENG.md`).

## 1. Pelajaran dari Otopsi (mengapa benteng ini ada)

| Kejadian | Akar Masalah | Pelajaran |
|---|---|---|
| TP/Ambisius/PowerMax tercapai tanpa notifikasi | Pengirim Telegram adalah sesi agent yang mati saat sandbox tidur | Notifikasi tidak boleh tinggal di satu tubuh |
| Sandbox gagal start 3× beruntun | Tubuh eksekusi bersifat *ephemeral* (bisa tidur/mati mendadak) | Nyawa tidak boleh bergantung pada satu tubuh |
| Sandbox di-RESET PENUH 12:50 WIB — token, chat ID, script, worklog hari ini hilang semua | Disk lokal di-rollback ke snapshot lama | **Intai wajib punya rumah tahan reset di Rantaian** (`benteng/`) |
| Simbol SYNUSDT membutakan seluruh batch harga (siklus 1235) | Satu simbol rusak → batch 400 → penjaga TP buta | Normalisasi simbol + fallback per-simbol WAJIB di semua lapis |
| Kematian lama tak tercatat | Tidak ada jurnal | Kematian = data; tanpa jurnal tidak ada evolusi imunitas |

## 2. Formula Benteng

```
NYAWA_SISTEM = max(D1, D2, D3)          # cukup SATU lapis hidup, sistem hidup
IMUNITAS     = jumlah_lapis_independen   # target: >= 3, tidak berbagi tubuh
KEJUJURAN    = setiap_gap > 35 menit  ->  pengakuan wajib + catat jurnal
KEMATIAN     = semua_lapis_diam > 90 menit   # praktis mustahil dalam desain ini
DAYA-TAHAN-RESET = intai lokal bisa dibangun ulang dari Rantaian dalam < 2 menit
```

- **Independen** = beda infrastruktur, beda jam picu, beda jalur kirim.
- Satu lapis boleh mati kapan pun; yang dilarang adalah **dua lapis mati bersamaan tanpa jejak**.
- Setiap lapis punya **jurnal kematian sendiri** -> otopsi berikutnya cukup baca data.

## 3. Empat Lapis yang Terpasang

### Lapis 1 — Denyut Tubuh (cron platform, tiap 30 menit)
- Job cron denyut utama, self-bootstrap: menanam token, chat ID, membangun ulang `scripts/heartbeat.py`.
- Setelah reset 12:50 WIB: penyelamat membangun ulang semuanya, detak pulih (message_id 171).
- Sumber kebenaran script: **`benteng/heartbeat_local.py` di Rantaian** (seed tahan reset).

### Lapis 2 — 🛟 PENYELAMAT (cron platform, tiap jam :50 WIB)
- Job cron penyelamat. Prinsip: **bicara hanya bila diam** (gap denyut utama >= 40 menit).
- Terbukti pada reset 12:50 WIB: dia yang membangkitkan lapis 1 dari kubur.

### Lapis 3 — 🛡️ BENTENG ABADI (GitHub Actions, tiap 30 menit :07/:37 UTC)
- Rumah: repo `ririnsherlyna-cloud/Rantaian` -> workflow `benteng-telegram.yml` + `scripts/benteng_telegram.py`.
- Tubuh **beda planet**: server GitHub, tidak menyentuh sandbox.
- Tugas ganda: detak hidup + **penjaga level** TP / JUAL AMBISIUS / POWER MAX AMBISIUS / STOP (10 sasaran, harga live Binance, state anti-banjir `data/penjaga_state.json`).
- Nyawa token dibaca dari `benteng/nyawa.json` (izin eksplisit pemilik; rotasi tetap disarankan).
- Run pertama terbukti: message_id 167 dari server GitHub; run ke-2 hijau.

### Lapis 4 — ⚰️ Jurnal Kematian
- `data/death_journal.jsonl` (lokal) + jurnal di repo (abadi, ikut dikomit).
- Setiap gap > 35 menit (tubuh) / > 45 menit (abadi) tercatat: waktu, durasi, lapis penjinak, bukti pulih.

## 4. Metode Agahan Tambahan (hukum mulai sekarang)

1. **Disk lokal = serda. Intai inti wajib tersimpan di Rantaian** (`benteng/`): `nyawa.json`, `heartbeat_local.py`, dokumen ini.
2. **Setiap fitur baru wajib punya jalur Telegram yang tidak bergantung sandbox.**
3. **Tidak ada satu tubuh yang boleh punya kuasa veto atas nyawa.**
4. **Keheningan > 35 menit pada SEMUA kanal = darurat** -> penyelamat bicara, laporan harian memuat rekap.
5. **Jam picu disebar anti-tabrakan**: tubuh ±:26/:56, penyelamat :50, abadi :14/:44 WIB, harian 08:00.
6. **Rotasi token tetap disarankan** (token kini ada di repo publik dengan izin pemilik; risiko pembajakan bot, bukan risiko dana).

## 5. Protokol RESTORASI CEPAT (setelah reset sandbox — untuk agent mana pun)

```bash
mkdir -p /home/z/my-project/data /home/z/my-project/scripts
# 1) nyawa
curl -s https://raw.githubusercontent.com/ririnsherlyna-cloud/Rantaian/main/benteng/nyawa.json > /tmp/nyawa.json
python3 -c "import json;d=json.load(open('/tmp/nyawa.json'));open('/home/z/my-project/.token-telegram','w').write(d['bot_token']);open('/home/z/my-project/data/telegram_chat_id','w').write(str(d['chat_id']))"
chmod 600 /home/z/my-project/.token-telegram
# 2) script detak lokal
curl -s https://raw.githubusercontent.com/ririnsherlyna-cloud/Rantaian/main/benteng/heartbeat_local.py > /home/z/my-project/scripts/heartbeat.py
chmod +x /home/z/my-project/scripts/heartbeat.py
# 3) detak pertama (pengakuan otomatis bila gap > 35 menit)
python3 /home/z/my-project/scripts/heartbeat.py
```

## 6. Jadwal Denyut (WIB)

| Lapis | Jam | Bicara kapan |
|---|---|---|
| Denyut tubuh | ± :26 / :56 | Setiap detak |
| Penyelamat | :50 | Hanya bila lapis 1 diam > 40 mnt |
| Benteng abadi (Actions) | :14 / :44 | Setiap detak + kejadian level |
| Laporan harian | 08:00 | Rekap jujur harian |

## 7. Cara Membuktikan (untuk pemilik)

- Telegram masuk ± 4× per jam dari 2 tubuh berbeda planet; label berbeda: "💓 DETAK HIDUP" (tubuh) vs "🛡️ BENTENG ABADI" (GitHub).
- Riwayat run abadi: `github.com/ririnsherlyna-cloud/Rantaian/actions` — hijau = hidup, merah = jurnal kematian terisi.
- "periksa aktivasi" tetap berlaku kapan pun pemilik ingin bertanya langsung.
