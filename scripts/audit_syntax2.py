#!/usr/bin/env python3
"""Audit sintaks v2: hanya tag <script> yang berdiri sendiri di awal baris."""
import re, subprocess, os

SRC = "/home/z/my-project/upload/Micaprofita_V137_PRO_GAHAR_V190 (35).html"
OUT = "/home/z/my-project/scripts/audit_blocks_v2"
os.makedirs(OUT, exist_ok=True)

with open(SRC, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

# Tag nyata: baris yang dimulai dengan <script> (whitespace opsional)
opens = []  # (line_no_1based)
for i, ln in enumerate(lines):
    if re.match(r"^\s*<script>\s*$", ln):
        opens.append(i + 1)
closes = []
for i, ln in enumerate(lines):
    if re.match(r"^\s*</script>\s*$", ln):
        closes.append(i + 1)

print(f"Tag <script> nyata: {len(opens)}, </script>: {len(closes)}")

blocks = []
if len(opens) == len(closes):
    for o, c in zip(opens, closes):
        code = "".join(lines[o:c - 1])
        blocks.append((o, code))
else:
    # fallback: pasangkan berurutan
    n = min(len(opens), len(closes))
    print("WARN: jumlah tidak seimbang, pasangkan berurutan")
    for k in range(n):
        o, c = opens[k], closes[k]
        if c > o:
            blocks.append((o, "".join(lines[o:c - 1])))

print(f"Blok dipasangkan: {len(blocks)}")
bad = []
for i, (line_no, code) in enumerate(blocks):
    path = os.path.join(OUT, f"b{i:03d}_L{line_no}.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
    if r.returncode != 0:
        msg = " | ".join((r.stderr or "").strip().splitlines()[:3])
        bad.append((i, line_no, path, msg))
        print(f"[SALAH] blok #{i} (line {line_no}): {msg[:200]}")

print(f"\n=== RINGKASAN: {len(bad)} blok rusak / {len(blocks)} blok ===")
