#!/usr/bin/env bash
# ============================================================
# BANGUN RUMAH V260 — replikasi tubuh SAKTI penuh ke
#   akiomida/micaprofita-sakti  (rumah baru di bawah akun
#   yang token-nya punya izin tulis penuh), lalu overlay
#   V259-KAIZEN-PULIH + V260-AUTOPILOT-KALIBRASI (lokal).
# Urutan kritis: set izin workflow WRITE dulu, baru push
#   (push memicu denyut pertama via on:push).
# Jalankan: export GH_TOKEN=... && bash scripts/sarang/bangun_rumah_v260.sh
# ============================================================
set -euo pipefail
TOKEN="${GH_TOKEN:?export GH_TOKEN dulu}"
REPO_BARU="akiomida/micaprofita-sakti"
BASE=/home/z/my-project
H="$BASE/rumah_baru"

echo "== 0. izin workflow WRITE (sebelum push yang memicu denyut) =="
curl -s -o /dev/null -w "workflow-perms HTTP:%{http_code}\n" -X PUT \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO_BARU/actions/permissions/workflow" \
  -d '{"default_workflow_permissions":"write","can_approve_pull_request_reviews":false}'

echo "== 1. clone induk (publik, V258 hidup) =="
rm -rf "$BASE/rumah_induk" "$H"
git clone --depth 1 --quiet https://github.com/ririnsherlyna-cloud/Micaprofita-.git "$BASE/rumah_induk"

echo "== 2. clone rumah baru =="
git clone --depth 1 --quiet "https://x-access-token:${TOKEN}@github.com/${REPO_BARU}.git" "$H"

echo "== 3. salin tubuh induk -> rumah baru (tanpa .git) =="
(cd "$BASE/rumah_induk" && tar --exclude=./.git -cf - .) | (cd "$H" && tar -xf -)

echo "== 4. overlay V259+V260 lokal (otak v5.6, dasbor v3.0, TUJUAN 12c+12d) =="
cp "$BASE/scripts/penjaga.mjs"               "$H/scripts/penjaga.mjs"
cp "$BASE/scripts/sarang/dasbor_laporan.html" "$H/laporan/index.html"
cp "$BASE/TUJUAN.md"                          "$H/TUJUAN.md"

echo "== 5. URL Pages baru di komentar workflow =="
sed -i 's#https://ririnsherlyna-cloud.github.io/Micaprofita-/laporan/sasaran-terkini.json#https://akiomida.github.io/micaprofita-sakti/laporan/sasaran-terkini.json (rumah cermin: ririnsherlyna-cloud/Micaprofita- — V258)#' \
  "$H/.github/workflows/sakti-denyut.yml"

echo "== 6. node --check otak =="
node --check "$H/scripts/penjaga.mjs" && echo "penjaga.mjs sintaks OK"

echo "== 7. komit & dorong (TANPA [skip ci] — denyut pertama harus jalan) =="
cd "$H"
git config user.name  "SARANG-PENJAGA"
git config user.email "penjaga@micaprofita.local"
git add -A
git commit --quiet -m "SAKTI pindah denyut: tubuh lengkap direplikasi (V258) + naik V259-KAIZEN-PULIH & V260-AUTOPILOT-KALIBRASI v5.6 — otak 4.553 baris, registri 191 param bernama (timbangan-alt, kelly-lapis, rezim-medan, uji-tegang, slip-neto, peluang-skor, top-tolak + 4 loop kaizen); dasbor v3.0 seksi Warisan AutoPilot; denyut pertama rumah baru via on:push"
git push --quiet origin main
echo "push OK: $(git -C "$H" log -1 --format='%h %s' | head -c 120)"

echo "== 8. scrub token dari .git/config =="
git remote set-url origin "https://github.com/${REPO_BARU}.git"

echo "== 9. aktifkan Pages (main / root) =="
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO_BARU/pages" \
  -d '{"source":{"branch":"main","path":"/"}}' -w "pages HTTP:%{http_code}\n" | tail -1

echo "== 10. dispatch denyut eksplisit (jaga-jaga) =="
curl -s -o /dev/null -w "dispatch HTTP:%{http_code}\n" -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO_BARU/actions/workflows/sakti-denyut.yml/dispatches" \
  -d '{"ref":"main"}'

echo "SELESAI-BANGUN — verifikasi lanjut: scripts/sarang/verifikasi_rumah_v260.sh"
