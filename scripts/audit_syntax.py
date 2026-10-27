#!/usr/bin/env python3
"""Ekstrak semua blok <script> dari HTML raksasa dan cek sintaks JS satu per satu."""
import re, subprocess, sys, os, tempfile

SRC = "/home/z/my-project/upload/Micaprofita_V137_PRO_GAHAR_V190 (35).html"
OUT = "/home/z/my-project/scripts/audit_blocks"
os.makedirs(OUT, exist_ok=True)

with open(SRC, "r", encoding="utf-8", errors="replace") as f:
    html = f.read()

# Temukan semua blok script inline (tanpa src=)
pat = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>", re.IGNORECASE)
blocks = []
for m in pat.finditer(html):
    start = m.end()
    end = html.find("</script>", start)
    if end == -1:
        continue
    line_no = html.count("\n", 0, m.start()) + 1
    blocks.append((line_no, html[start:end]))

print(f"Total blok <script> inline: {len(blocks)}")

bad = []
for i, (line_no, code) in enumerate(blocks):
    # Lompati blok yang mengandung tag markup <script> di line pertama (nested weirdness)
    path = os.path.join(OUT, f"blk_{i:04d}_L{line_no}.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
    if r.returncode != 0:
        err = (r.stderr or r.stdout).strip().splitlines()
        msg = " | ".join(err[:3])
        bad.append((i, line_no, path, msg))
        print(f"[SALAH] blok #{i} (HTML line {line_no}): {msg[:220]}")

print(f"\n=== RINGKASAN: {len(bad)} blok rusak dari {len(blocks)} ===")
with open(os.path.join(OUT, "AUDIT_RESULT.txt"), "w") as f:
    for i, line_no, path, msg in bad:
        f.write(f"blok #{i} HTML-line {line_no} file {path}\n  {msg}\n\n")
print("Detail tersimpan di AUDIT_RESULT.txt")
