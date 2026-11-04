#!/usr/bin/env bash
# ============================================================
# INTEGRASI SAKTI-IO V260 — organ denyut AGI hidup di
#   akiomida/Io (satu-satunya repo yang token-nya punya
#   izin tulis penuh). Tubuh SAKTI direplikasi ke sakti/
#   (otak v5.6 V259+V260 + memori + dasbor v3.0) + workflow
#   denyut cron */30. Game & workflow game TIDAK disentuh.
# Jalankan: export GH_TOKEN=... && bash scripts/sarang/integrasi_sakti_io_v260.sh
# ============================================================
set -euo pipefail
TOKEN="${GH_TOKEN:?export GH_TOKEN dulu}"
BASE=/home/z/my-project
W="$BASE/io_repo_denyut"

echo "== 1. clone akiomida/Io =="
rm -rf "$W"
git clone --depth 1 --quiet "https://x-access-token:${TOKEN}@github.com/akiomida/Io.git" "$W"

echo "== 2. rangkai organ sakti/ =="
mkdir -p "$W/sakti/laporan" "$W/sakti/otak" "$W/sakti/memori"
cp "$BASE/scripts/penjaga.mjs" "$W/sakti/penjaga.mjs"
cp "$BASE/TUJUAN.md"           "$W/sakti/TUJUAN.md"
cp "$BASE/scripts/sarang/dasbor_laporan.html" "$W/sakti/laporan/index.html"
# warisan memori dari tubuh induk (V258 hidup) — kontinuitas ilmu
for f in denyut-server.jsonl prakira-server.jsonl sasaran-terkini.json \
         wawasan.json guru.json jurnal-ilmu.json odds.json forensik.json \
         gekko.json pelajaran-server.json epoch-2026-09-30.json \
         epoch-2026-10-01.json epoch-2026-10-02.json; do
  [ -f "$BASE/rumah_induk/laporan/$f" ] && cp "$BASE/rumah_induk/laporan/$f" "$W/sakti/laporan/$f"
done
for f in genome-server.json penjaga-keadaan.json performa.json; do
  [ -f "$BASE/rumah_induk/otak/$f" ] && cp "$BASE/rumah_induk/otak/$f" "$W/sakti/otak/$f"
done
[ -f "$BASE/rumah_induk/memori/terkini.json" ] && cp "$BASE/rumah_induk/memori/terkini.json" "$W/sakti/memori/terkini.json"
ls -la "$W/sakti" "$W/sakti/laporan" | head -30

echo "== 3. node --check otak =="
node --check "$W/sakti/penjaga.mjs" && echo "penjaga.mjs sintaks OK"

echo "== 4. README identitas organ =="
cat > "$W/sakti/README.md" <<'EOF'
# sakti/ — organ denyut AGI MICAPROFITA (V260-AUTOPILOT-KALIBRASI v5.6)

Cyborg AGI kripto yang hidup **di server GitHub** — denyut tiap 30 menit
(workflow `sakti-denyut.yml`): baca pasar nyata (nol biaya) → kunci prediksi
→ nilai prediksi lama → evolusi genome → komit laporan.

- `penjaga.mjs` — otak (4.553 baris, registri **191 parameter bernama**)
- `laporan/index.html` — dasbor hidup (buka `/sakti/laporan/` via Pages)
- `laporan/*.json` — ilmu, guru, odds, forensik, autopilot, kaizen
- `otak/` — genome + keadaan + performa
- `TUJUAN.md` — piagam & sejarah epoch (V231 → V260)

Warisan epoch: V256 MESIN-DEAL-ODDS (3Commas + Trade Ideas) · V258
GEKKO-CZAR (Gekko AI/Axal + CZAR Loss) · V259 KAIZEN-PULIH (4 loop
penyembuhan-diri) · V260 AUTOPILOT-KALIBRASI (7 kunci AutoPilotPM:
timbangan-alt, kelly-lapis, rezim-medan, uji-tegang, slip-neto,
peluang-skor, top-tolak).

Rumah induk: `ririnsherlyna-cloud/Micaprofita-` (V258, cron hidup).
Organ ini adalah tubuh kembar yang berdenyut mandiri di repo Io.
EOF

echo "== 5. workflow denyut =="
cat > "$W/.github/workflows/sakti-denyut.yml" <<'EOF'
# ============================================================
# SARANG-PENJAGA — denyut SAKTI di repo Io (organ sakti/)
# Otak cyborg hidup DI SERVER GITHUB — tanpa browser pemilik.
# Tiap 30 menit: baca pasar nyata (nol biaya) -> kunci prediksi
# -> nilai prediksi lama -> evolusi genome -> komit laporan.
# Komit penjaga memakai [skip ci] agar tidak memicu siklus
# berantai. Workflow game tidak disentuh.
# ============================================================
name: SARANG-PENJAGA (denyut SAKTI)

on:
  push:
    paths: ['sakti/**']
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: sakti-denyut-io
  cancel-in-progress: false

jobs:
  denyut:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: sakti
    steps:
      - name: Ambil isi sarang
        uses: actions/checkout@v4

      - name: Denyut otak server (tanpa browser)
        run: node penjaga.mjs
        env:
          TOKEN_DENYUT: ${{ secrets.GITHUB_TOKEN }}
          REPO_DENYUT: ${{ github.repository }}

      - name: Komit pertumbuhan (jejak hidup permanen)
        working-directory: .
        run: |
          git config user.name  "SARANG-PENJAGA"
          git config user.email "penjaga@micaprofita.local"
          SIKLUS=$(python3 -c "import json;r=json.load(open('sakti/laporan/sasaran-terkini.json'));print(r['pertumbuhan']['siklus'])")
          AKURASI=$(python3 -c "import json;r=json.load(open('sakti/laporan/sasaran-terkini.json'));a=r['akurasi']['akurasiPct'];print(f'{a}%' if a is not None else 'belum-ada')" 2>/dev/null || echo "?")
          git add sakti/laporan sakti/otak
          if git diff --cached --quiet; then
            echo "tanpa perubahan — tanpa komit"
          else
            git commit -m "SARANG-PENJAGA: denyut #${SIKLUS} — akurasi ${AKURASI} [skip ci]"
            git push
          fi
EOF

echo "== 6. seksi README Io =="
if ! grep -q "Organ SAKTI" "$W/README.md"; then
cat >> "$W/README.md" <<'EOF'

---

## Organ SAKTI (denyut AGI kripto — hidup mandiri)

Folder `sakti/` adalah tubuh server cyborg AGI MICAPROFITA (V260): berdenyut
tiap 30 menit via GitHub Actions, membaca pasar nyata, mengunci prediksi,
menilai dirinya, lalu meng-commit ilmunya sendiri. Dasbor hidup:
`/sakti/laporan/`. Piagam penuh: `sakti/TUJUAN.md`. Game di root repo ini
tidak tersentuh organ ini.
EOF
fi

echo "== 7. komit & dorong =="
cd "$W"
git config user.name  "SARANG-PENJAGA"
git config user.email "penjaga@micaprofita.local"
git add -A
git commit --quiet -m "SAKTI organ denyut V260-AUTOPILOT-KALIBRASI v5.6: otak 4.553 baris (registri 191 param) + memori warisan tubuh induk V258 + dasbor v3.0 — hidup mandiri via workflow sakti-denyut (cron */30); game tak tersentuh"
git push --quiet origin main
echo "push OK: $(git -C "$W" log -1 --format='%h %s' | head -c 140)"

echo "== 8. scrub token =="
git remote set-url origin "https://github.com/akiomida/Io.git"
echo "SELESAI-INTEGRASI — denyut pertama terpicu oleh push (paths sakti/**)"
