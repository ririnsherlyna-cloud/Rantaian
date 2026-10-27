#!/usr/bin/env python3
# SUNTIK BIBIT V282 — benamkan arsip lilin nyata ke hidup.html (pengganti /*@BIBIT@*/null)
import json

HTML = '/home/z/my-project/download/hidup.html'
BIBIT = '/home/z/my-project/scripts/sarang/bibit_v282.json'

src = open(HTML).read()
bibit = open(BIBIT).read()
# validasi json
json.loads(bibit)
penanda = '/*@BIBIT@*/null'
assert penanda in src, 'penanda tidak ditemukan'
src = src.replace(penanda, bibit)
open(HTML, 'w').write(src)
print('bibit tersuntik:', len(bibit), 'B — ukuran HTML kini', len(src), 'B')
