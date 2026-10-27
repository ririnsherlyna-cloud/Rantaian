#!/usr/bin/env python3
"""Injeksi organ V237 SAKTI-FBO ke file final Micaprofita_V231_SAKTI.html.

Idempoten: blok ditandai /*V237-FBO:BEGIN*/ ... /*V237-FBO:END*/ —
menjalankan ulang akan MENGGANTI blok lama, bukan menduplikasi.
Termasuk uji perilaku organ (node, harus >= 21/21 PASS) sebelum menyuntik +
re-audit semua blok <script> file final.
"""
import re, subprocess

DST = "/home/z/my-project/download/Micaprofita_V231_SAKTI.html"
INJ = "/home/z/my-project/scripts/v237_fbo.js"
HARNESS = "/home/z/my-project/scripts/v237_fbo_test.js"

# ---------- 0. Uji perilaku organ dulu (harus >= 21/21 PASS) ----------
with open(HARNESS, "w", encoding="utf-8") as f:
    f.write(
        "global.window = {};\n"
        "global.document = { readyState: 'complete', getElementById: () => null,"
        " createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };\n"
        "global.setInterval = () => 0;\n"
        "require('" + INJ + "');\n"
        "const r = global.window.V231_SAKTI.FBO.ujiDiri();\n"
        "console.log(JSON.stringify(r));\n"
        "if (parseInt(r.pass) < 21) { console.error('UJI DIRI GAGAL: ' + r.pass); process.exit(1); }\n"
    )
r = subprocess.run(["node", HARNESS], capture_output=True, text=True)
print("Uji perilaku organ:", (r.stdout or r.stderr).strip()[:300])
assert r.returncode == 0, "Organ gagal uji diri — injeksi dibatalkan"

# ---------- 1. Baca file final ----------
with open(DST, "r", encoding="utf-8") as f:
    html = f.read()
ukuran_awal = len(html)

# ---------- 2. Hapus blok lama bila ada (idempoten, dengan/tanpa wrapper) ----------
html = re.sub(r"<script>\s*/\*V237-FBO:BEGIN\*/.*?/\*V237-FBO:END\*/\s*</script>\n?", "", html, flags=re.S)
html = re.sub(r"/\*V237-FBO:BEGIN\*/.*?/\*V237-FBO:END\*/\n?", "", html, flags=re.S)

# ---------- 3. Suntik blok baru (BERWRAPPER <script>) sebelum </body> ----------
with open(INJ, "r", encoding="utf-8") as f:
    organ = f.read()
blok = "\n<script>\n" + organ + "\n</script>\n"
idx = html.rfind("</body>")
assert idx != -1, "</body> tidak ditemukan"
html = html[:idx] + blok + html[idx:]

# ---------- 4. Simpan ----------
with open(DST, "w", encoding="utf-8") as f:
    f.write(html)

# ---------- 5. Re-audit semua blok <script> ----------
lines = html.split("\n")
opens = [i for i, ln in enumerate(lines, 1) if re.match(r"^\s*<script>\s*$", ln)]
closes = [i for i, ln in enumerate(lines, 1) if re.match(r"^\s*</script>\s*$", ln)]
assert len(opens) == len(closes), f"<script> standalone tak seimbang: {len(opens)} vs {len(closes)}"
rusak = []
for nn, (aa, bb) in enumerate(zip(opens, closes)):
    p = f"/tmp/audit_v237_{nn}.js"
    with open(p, "w", encoding="utf-8") as f:
        f.write("\n".join(lines[aa:bb - 1]))
    rr = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if rr.returncode != 0:
        rusak.append((nn, (rr.stderr or "").strip().splitlines()[-1] if rr.stderr else "?"))

print(f"Ukuran: {ukuran_awal} -> {len(html)} byte (+{len(html)-ukuran_awal})")
print(f"Re-audit blok <script>: {len(opens)} blok, rusak={len(rusak)}")
for rn, msg in rusak[:5]:
    print("  rusak:", rn, msg)
assert not rusak, "Ada blok script rusak setelah injeksi"
print("INJEKSI V237 SAKTI-FBO BERHASIL (idempoten, semua blok valid)")
