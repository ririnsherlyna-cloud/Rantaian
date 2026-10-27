#!/usr/bin/env python3
"""Injeksi organ V232 SAKTI-MATA ke file final Micaprofita_V231_SAKTI.html.

Idempoten: blok ditandai /*V232-MATA:BEGIN*/ ... /*V232-MATA:END*/ —
menjalankan ulang akan MENGGANTI blok lama, bukan menduplikasi.
Termasuk uji perilaku organ (node) sebelum menyuntik + re-audit
semua blok <script> file final.
"""
import shutil, re, subprocess, os, json

DST = "/home/z/my-project/download/Micaprofita_V231_SAKTI.html"
INJ = "/home/z/my-project/scripts/v232_mata.js"
HARNESS = "/home/z/my-project/scripts/v232_mata_test.js"

# ---------- 0. Uji perilaku organ dulu (harus 3/3 PASS) ----------
with open(HARNESS, "w", encoding="utf-8") as f:
    f.write(
        "global.window = {};\n"
        "global.document = { readyState: 'complete', getElementById: () => null,"
        " createElement: () => ({ style: {} }), body: { appendChild() {} }, addEventListener() {} };\n"
        "global.setTimeout = (f) => { try { f(); } catch (e) {} ; return 0; };\n"
        "global.setInterval = () => 0;\n"
        "require('" + INJ + "');\n"
        "const r = global.window.V232_MATA.ujiDiri();\n"
        "console.log(JSON.stringify(r));\n"
        "if (r.pass !== '6/6') { console.error('UJI DIRI GAGAL'); process.exit(1); }\n"
    )
r = subprocess.run(["node", HARNESS], capture_output=True, text=True)
print("Uji perilaku organ:", (r.stdout or r.stderr).strip())
assert r.returncode == 0, "Organ gagal uji diri — injeksi dibatalkan"

# ---------- 1. Baca file final ----------
with open(DST, "r", encoding="utf-8") as f:
    html = f.read()
ukuran_awal = len(html)

# ---------- 2. Hapus blok lama bila ada (idempoten) ----------
html = re.sub(r"/\*V232-MATA:BEGIN\*/.*?/\*V232-MATA:END\*/\n?", "", html, flags=re.S)

# ---------- 3. Suntik blok baru sebelum </body> ----------
with open(INJ, "r", encoding="utf-8") as f:
    organ = f.read()
blok = "\n" + organ + "\n"
idx = html.rfind("</body>")
assert idx != -1, "</body> tidak ditemukan"
html = html[:idx] + blok + html[idx:]

# ---------- 4. Judul diperbarui ----------
html = html.replace(
    "Micaprofita V231 SAKTI — AGI Cyborg Guru Trader (V189 + V230 AGEN + V231 Lima Organ)",
    "Micaprofita V231 SAKTI — AGI Cyborg Guru Trader (V189 + V230 AGEN + V231 Lima Organ + V232 SAKTI-MATA)",
    1,
)

with open(DST, "w", encoding="utf-8") as f:
    f.write(html)

# ---------- 5. Re-audit penuh: semua blok script ----------
with open(DST, "r", encoding="utf-8") as f:
    lines = f.readlines()
opens, closes = [], []
for i, ln in enumerate(lines):
    if re.match(r"^\s*<script>\s*$", ln):
        opens.append(i + 1)
    if re.match(r"^\s*</script>\s*$", ln):
        closes.append(i + 1)
assert len(opens) == len(closes), f"tag tidak seimbang {len(opens)} vs {len(closes)}"
bad = 0
for o, c in zip(opens, closes):
    p = "/tmp/final_blk.js"
    with open(p, "w", encoding="utf-8") as f:
        f.write("".join(lines[o:c - 1]))
    rr = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if rr.returncode != 0:
        bad += 1
        print(f"[SALAH] blok line {o}: {(rr.stderr or '')[:150]}")
print(f"Re-audit final: {len(opens)} blok, {bad} rusak -> {'SEMUA VALID' if bad == 0 else 'ADA MASALAH'}")
print(f"Final: {DST} ({os.path.getsize(DST)/1024/1024:.1f} MB, +{(len(html)-ukuran_awal)/1024:.1f} KB organ MATA)")
