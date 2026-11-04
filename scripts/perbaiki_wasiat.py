#!/usr/bin/env python3
# Perbaikan satu kali: pulihkan 6 entri worklog yang terdedup salah oleh
# SINKRON-WASIAT v1 (kunci lama = Task ID saja; Task ID ternyata tidak
# unik antarhari). Union tiga sumber dgn kunci hash isi (v2):
# git HEAD worklog + worklog lokal sekarang + salinan repo.
import sys

sys.path.insert(0, "/home/z/my-project/scripts")
import importlib
import sinkron_wasiat
importlib.reload(sinkron_wasiat)  # pastikan kunci() versi hash-isi
from sinkron_wasiat import API, parse, kunci, render, push_file, req

LOKAL = "/home/z/my-project/worklog.md"
HEAD = "/tmp/worklog_head.md"

hl, el = parse(open(LOKAL, encoding="utf-8").read())
hh, eh = parse(open(HEAD, encoding="utf-8").read())
st, repo_txt = req("GET", f"{API}/contents/data/worklog_sandbox.md",
                   ctype="application/vnd.github.raw")
hr, er = parse(repo_txt if st == 200 and isinstance(repo_txt, str) else "")

seen, merged = set(), []
for sumber in (eh, el, er):          # urutan kronologis: HEAD dulu
    for e in sumber:
        k = kunci(e)
        if k not in seen:
            seen.add(k)
            merged.append(e)
teks = render(hh or hl, merged)

open(LOKAL, "w", encoding="utf-8").write(teks)
ok = push_file("data/worklog_sandbox.md", teks.encode(), "wasiat: pulih 6 entri + kunci hash-isi")
print("entri union:", len(merged), "| HEAD:", len(eh), "| lokal:", len(el), "| push:", ok)
sys.exit(0 if ok else 1)
