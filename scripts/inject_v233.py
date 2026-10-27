#!/usr/bin/env python3
"""Injeksi organ V233 SAKTI-BULLTRAP ke file final Micaprofita_V231_SAKTI.html.

Idempoten: blok ditandai /*V233-BULLTRAP:BEGIN*/ ... /*V233-BULLTRAP:END*/ —
menjalankan ulang akan MENGGANTI blok lama, bukan menduplikasi.
Termasuk uji perilaku organ (node, harus 4/4 PASS) sebelum menyuntik +
re-audit semua blok <script> file final.
"""
import re, subprocess

DST = "/home/z/my-project/download/Micaprofita_V231_SAKTI.html"
INJ = "/home/z/my-project/scripts/v233_bulltrap.js"
HARNESS = "/home/z/my-project/scripts/v233_bulltrap_test.js"

# ---------- 0. Uji perilaku organ dulu (harus 4/4 PASS) ----------
with open(HARNESS, "w", encoding="utf-8") as f:
    f.write(
        "global.window = {};\n"
        "global.document = { readyState: 'complete', getElementById: () => null,"
        " createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };\n"
        "global.setTimeout = (f) => { try { f(); } catch (e) {} ; return 0; };\n"
        "global.setInterval = () => 0;\n"
        "require('" + INJ + "');\n"
        "const r = global.window.V233_BULLTRAP.ujiDiri();\n"
        "console.log(JSON.stringify(r));\n"
        "if (r.pass !== '4/4') { console.error('UJI DIRI GAGAL'); process.exit(1); }\n"
    )
r = subprocess.run(["node", HARNESS], capture_output=True, text=True)
print("Uji perilaku organ:", (r.stdout or r.stderr).strip())
assert r.returncode == 0, "Organ gagal uji diri — injeksi dibatalkan"

# ---------- 1. Baca file final ----------
with open(DST, "r", encoding="utf-8") as f:
    html = f.read()
ukuran_awal = len(html)

# ---------- 2. Hapus blok lama bila ada (idempoten, dengan/tanpa wrapper) ----------
html = re.sub(r"<script>\s*/\*V233-BULLTRAP:BEGIN\*/.*?/\*V233-BULLTRAP:END\*/\s*</script>\n?", "", html, flags=re.S)
html = re.sub(r"/\*V233-BULLTRAP:BEGIN\*/.*?/\*V233-BULLTRAP:END\*/\n?", "", html, flags=re.S)

# ---------- 2b. PERBAIKAN V232 WARISAN: organ V232 telanjang (tak tereksekusi browser) ----------
# Bungkus region V232..V233 dalam satu <script> agar HIDUP.
html = html.replace("</script>\n\n\n\n/*V232-MATA:BEGIN*/", "</script>\n\n<script>\n/*V232-MATA:BEGIN*/")
if "/*V232-MATA:BEGIN*/" in html and "<script>\n/*V232-MATA:BEGIN*/" not in html:
    html = html.replace("/*V232-MATA:BEGIN*/", "<script>\n/*V232-MATA:BEGIN*/", 1)

# ---------- 3. Suntik blok baru (BERWRAPPER <script>) sebelum </body> ----------
with open(INJ, "r", encoding="utf-8") as f:
    organ = f.read()
blok = "\n<script>\n" + organ + "\n</script>\n"
idx = html.rfind("</body>")
assert idx != -1, "</body> tidak ditemukan"
html = html[:idx] + blok + html[idx:]

# ---------- 3b. Tutup wrapper V232 (jika baru dibuka dan belum ditutup) ----------
if "<script>\n/*V232-MATA:BEGIN*/" in html and not re.search(r"/\*V232-MATA:END\*/\s*</script>", html):
    html = re.sub(
        r"(/\*V232-MATA:END\*/)(\n*)(<script>\s*/\*V233-BULLTRAP:BEGIN\*/|\n*</body>)",
        r"\1\n</script>\n\n\3",
        html, count=1,
    )

# ---------- 4. Simpan ----------
with open(DST, "w", encoding="utf-8") as f:
    f.write(html)
print(f"File diperbarui: {ukuran_awal} -> {len(html)} byte (+{len(html)-ukuran_awal})")

# ---------- 5. Re-audit penuh: pasangkan tag <script> standalone (ala audit_syntax2) ----------
opens = [i for i, ln in enumerate(html.split("\n"), 1) if re.match(r"^\s*<script>\s*$", ln)]
closes = [i for i, ln in enumerate(html.split("\n"), 1) if re.match(r"^\s*</script>\s*$", ln)]
assert len(opens) == len(closes), f"<script> standalone tak seimbang: {len(opens)} vs {len(closes)}"
lines = html.split("\n")
bad = 0
for n, (a, b) in enumerate(zip(opens, closes)):
    p = f"/tmp/audit_v233_{n}.js"
    with open(p, "w", encoding="utf-8") as f:
        f.write("\n".join(lines[a:b - 1]))  # antara <script> dan </script>
    rr = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if rr.returncode != 0:
        bad += 1
        print(f"Blok #{n} (baris {a}) RUSAK: {rr.stderr[:200]}")
print(f"Re-audit final: {len(opens)} blok, {bad} rusak -> {'SEMUA VALID' if bad == 0 else 'ADA MASALAH'}")
