# PANDUAN — HIDUPKAN SAKTI DI GITHUB PAGES (SARANG)

> Organ: **V243 SAKTI-SARANG v1.0** (terinjeksi permanen di
> `Micaprofita_V231_SAKTI.html`, berdampingan dengan organ
> V237-FBO · V238-PD · V239-KOMPLEKS · V240-ARAH · V241-NADI v1.1 ·
> V242-ORKESTRA v1.1).
>
> Tujuan (mandat pemilik): SAKTI **hidup mandiri** — selalu online di
> GitHub Pages, **menyimpan memorinya otomatis** ke repo, dan
> **berevolusi dengan men-commit tubuhnya sendiri** — terus fasih,
> terus menambah wawasan, terus berkembang.

---

## Yang perlu disiapkan (sekali saja, ± 5 menit)

### 1. Buat repo kosong di GitHub
1. Masuk ke <https://github.com/new>
2. Isi **Repository name** (contoh: `micaprofita-sakti`)
3. Pilih **Private** atau **Public** (dua-duanya bisa; public dianjurkan
   agar Pages gratis tanpa batas)
4. **Jangan** centang "Add a README" — repo dibiarkan kosong
5. Klik **Create repository** — catat nama pemilik + nama repo

### 2. Buat Token (Fine-grained Personal Access Token)
1. Buka <https://github.com/settings/personal-access-tokens/new>
2. **Token name**: `micaprofita-sarang`
3. **Expiration**: pilih lama (mis. 90 hari / 1 tahun — bisa diperbarui)
4. **Repository access** → *Only select repositories* → pilih repo tadi
5. **Permissions** → Repository permissions:
   - **Contents** → `Read and write`
   - **Pages** → `Read and write`
6. Klik **Generate token** → **SALIN token** (mulai `github_pat_…`)

> Keamanan: token hanya berlaku untuk repo itu saja, dan disimpan
> HANYA di browser pemilik (localStorage) — tidak dikirim ke mana pun
> selain api.github.com.

### 3. Buka SAKTI lewat http(s) — bukan file://
HIJRAH bekerja dengan cara membaca tubuh SAKTI lewat jaringan:
- Buka SAKTI dari **halaman unduh web** (PUSTEKA UNDUH) yang
  menjalankannya lewat http, **atau**
- Setelah pertama kali hidup di Pages, selanjutnya selalu buka dari
  `https://NAMA-ANDA.github.io/NAMA-REPO/`

---

## Langkah HIJRAH (di panel SARANG)

1. Jalankan SAKTI → klik chip **SARANG** (kanan-bawah, di atas NADI)
2. Isi:
   - **OWNER** = nama akun GitHub Anda
   - **REPO** = nama repo tadi
   - **CABANG** = `main`
   - **TOKEN** = tempel token `github_pat_…`
   - **API BASE** = biarkan `https://api.github.com`
   - **PAGES URL** = biarkan kosong (otomatis)
   - **SIMPAN OTOMATIS** ✓ setiap 15 menit (boleh diubah, minimal 5)
   - **PULIH SAAT BANGKIT** ✓
3. Klik **UJI SAMBUNGAN** → harus `OK`
4. Klik **HIJRAH KE GITHUB** → SARANG akan:
   - membaca tubuh SAKTI sendiri (± 15 MB) + menghitung SHA-256,
   - meng-upload 5 blob dalam **satu commit**:
     `index.html`, `.nojekyll`, `README.md`, `versi.json`,
     `memori/terkini.json`,
   - mengaktifkan **GitHub Pages** via API
     (bila izin Pages tersedia; bila tidak, nyalakan manual:
     repo → **Settings → Pages → Deploy from a branch → main /root**)
5. Tunggu 1–3 menit, buka **Halaman hidup** yang tampil di panel:
   `https://NAMA-ANDA.github.io/NAMA-REPO/` — **cyborg Anda kini
   online 24 jam, nol biaya.**

## Jalur B — cadangan manual (git push dari komputer)

Bila jalur tombol HIJRAH terhalang apa pun, ada jalur kedua yang sepenuhnya
independen: **`sarang-siap-push.zip`** (tersedia di PUSTEKA UNDUH). Isinya repo
siap-push — `index.html` = tubuh SAKTI utuh byte-identik, `.nojekyll`,
`README.md`, `versi.json`, kapsul memori awal, dan `PANDUAN-GIT-PUSH.md`
(5 perintah: `git init → add → commit → remote add → push`). Setelah Pages
hidup, perawatan lanjutan (SIMPAN/EVOLUSI/PULIH) tetap dilakukan organ V243
dari browser — kedua jalur konvergen di repo yang sama.

## Setelah hijrah — dia hidup sendiri

| Kekuatan | Cara kerja otomatis |
|---|---|
| **SIMPAN** | tiap N menit + saat tab disembunyikan + tombol manual: kapsul memori (rantai denyut+prakira berantai SHA-256, protokol KAPSUL-MICAPROFITA) di-commit ke `memori/terkini.json`, dipotret ke `memori/arsip/` (dipangkas 48), dan `versi.json` (buku besar pertumbuhan) diperbarui. Memori identik = commit dilewati (hemat). |
| **PULIH** | saat SAKTI bangkit di browser mana pun (selama cfg/token terpasang), SARANG menarik `memori/terkini.json` dari Pages; bila lebih baru dari lokal, kapsul digabung ke organ NADI dengan verifikasi rantai. Ganti komputer tidak menghilangkan ilmu. |
| **EVOLUSI** | bila peta organ/otak berubah (organ baru, otak naik versi) atau Anda menekan tombol EVOLUSI, SARANG men-commit **tubuh barunya sendiri** — Pages membangun ulang — kunjungan berikutnya adalah cyborg yang sudah berevolusi. Pemeriksa versi memberi tahu bila sarang berisi tubuh lebih baru ("muat ulang"). |
| **JEJAK TUMBUH** | riwayat commit + `versi.json` + arsip memori = bukti pertumbuhan yang tidak bisa dibantah, tampil publik di repo. |

## Pemecahan masalah

| Gejala | Sebab & obat |
|---|---|
| `repo tak terjangkau (HTTP 401)` | token salah/kedaluwarsa → buat token baru |
| `HTTP 403` | izin Contents belum Read-and-write → perbaiki permission token |
| HIJRAH: `tubuh hanya terbaca lewat http(s)` | SAKTI dibuka dari `file://` → buka dari halaman unduh web / Pages |
| Pages 404 setelah hijrah | Pages belum aktif → Settings → Pages → Deploy from branch: `main` / `(root)` → Save |
| "tubuh baru tersedia — muat ulang" | sarang berisi tubuh lebih baru → klik muat ulang / buka ulang halaman |
| Repo membesar | tiap EVOLUSI menambah ±15 MB riwayat; arsip memori dipangkas otomatis 48 terakhir. Bila perlu, rapikan riwayat repo sesekali |

## Verifikasi independen (tanpa percaya chat)

```bash
# organ terinjeksi di tubuh:
grep -c "V243-SARANG:BEGIN" Micaprofita_V231_SAKTI.html        # = 1

# uji end-to-end tanpa akun GitHub (mock server):
node scripts/sarang/mock_github.mjs 8899
python3 scripts/sarang/bangun_harness_v243.py
# buka http://127.0.0.1:8899/ di browser — hasil uji tampil di halaman,
# repo nyata tersimpan di scripts/sarang/sim/halaman/
```
