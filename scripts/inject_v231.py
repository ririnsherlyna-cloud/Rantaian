#!/usr/bin/env python3
"""Injeksi V231 SAKTI ke salinan file final + update judul."""
import shutil, re, subprocess, os

SRC = "/home/z/my-project/upload/Micaprofita_V137_PRO_GAHAR_V190 (35).html"
DST = "/home/z/my-project/download/Micaprofita_V231_SAKTI.html"
INJ = "/home/z/my-project/scripts/v231_sakti.js"

os.makedirs("/home/z/my-project/download", exist_ok=True)
shutil.copyfile(SRC, DST)

with open(DST, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Judul diperbarui
html = html.replace(
    "<title>Micaprofita V136 — On-Chain Research Desk (V186 + V186-B + V187 + V188 + V189)</title>",
    "<title>Micaprofita V231 SAKTI — AGI Cyborg Guru Trader (V189 + V230 AGEN + V231 Lima Organ)</title>", 1
)

# 2. Baca modul V231 (tanpa tag <script> pembuka/penutup — kita bungkus sendiri)
with open(INJ, "r", encoding="utf-8") as f:
    modul = f.read()
modul_js = modul
if modul_js.startswith("<script>"):
    modul_js = modul_js[len("<script>"):]
if modul_js.rstrip().endswith("</script>"):
    modul_js = modul_js.rstrip()[: -len("</script>")]

blok = "\n<script>\n" + modul_js + "\n</script>\n"

# 3. Suntik sebelum </body> (tag penutup terakhir)
idx = html.rfind("</body>")
assert idx != -1, "</body> tidak ditemukan"
html = html[:idx] + blok + html[idx:]

with open(DST, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Final: {DST} ({os.path.getsize(DST)/1024/1024:.1f} MB)")

# 4. Re-audit penuh: semua blok script file final
with open(DST, "r", encoding="utf-8") as f:
    lines = f.readlines()
opens, closes = [], []
for i, ln in enumerate(lines):
    if re.match(r"^\s*<script>\s*$", ln): opens.append(i + 1)
    if re.match(r"^\s*</script>\s*$", ln): closes.append(i + 1)
assert len(opens) == len(closes), f"tag tidak seimbang {len(opens)} vs {len(closes)}"
bad = 0
for o, c in zip(opens, closes):
    p = "/tmp/final_blk.js"
    with open(p, "w", encoding="utf-8") as f:
        f.write("".join(lines[o:c - 1]))
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if r.returncode != 0:
        bad += 1
        print(f"[SALAH] blok line {o}: {(r.stderr or '')[:150]}")
print(f"Re-audit final: {len(opens)} blok, {bad} rusak → {'SEMUA VALID' if bad == 0 else 'ADA MASALAH'}")
