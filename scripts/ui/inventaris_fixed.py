#!/usr/bin/env python3
"""Inventaris semua elemen position:fixed di SAKTI: koordinat, z-index, konteks.
Tujuan: peta tumpukan widget sudut (penyebab saling timp)."""
import re, json, sys

SRC = '/home/z/my-project/download/Micaprofita_V231_SAKTI.html'
s = open(SRC, encoding='utf-8', errors='replace').read()

def ctx_text(pos, before=200, after=500):
    return s[max(0, pos-before):pos+after].replace('\n', ' ')

items = []
for m in re.finditer(r'position:\s*fixed', s):
    pos = m.start()
    ctx = ctx_text(pos)
    # id terdekat sebelum/sesudah
    idm = re.search(r'(?:id=["\']([\w\-]+)["\']|#([\w\-]+)[\s{,])', ctx)
    eid = (idm.group(1) or idm.group(2)) if idm else '?'
    # klasifikasi
    cls = 'overlay' if ('inset: 0' in ctx or 'top: 0' in ctx and 'bottom: 0' in ctx or 'top:0' in ctx and 'bottom:0' in ctx or 'inset:0' in ctx) else 'corner'
    bottom = re.search(r'bottom:\s*(\d+)(?:px)?', ctx)
    left = re.search(r'left:\s*(\d+)(?:px)?', ctx)
    right = re.search(r'right:\s*(\d+)(?:px)?', ctx)
    top = re.search(r'top:\s*(\d+)(?:px)?', ctx)
    z = re.search(r'z-index:\s*(\d+)', ctx)
    items.append({
        'pos': pos, 'id': eid, 'jenis': cls,
        'bottom': bottom.group(1) if bottom else None,
        'left': left.group(1) if left else None,
        'right': right.group(1) if right else None,
        'top': top.group(1) if top else None,
        'z': z.group(1) if z else None,
    })

corner = [i for i in items if i['jenis'] == 'corner']
print(f'TOTAL fixed: {len(items)} | overlay/modal: {len(items)-len(corner)} | corner/floating: {len(corner)}')
print()
# kelompokkan per sudut
sudut = {}
for i in corner:
    kiri = i['left'] is not None
    bawah = i['bottom'] is not None
    k = ('kiri' if kiri else ('kanan' if i['right'] is not None else '?')) + '-' + ('bawah' if bawah else ('atas' if i['top'] is not None else '?'))
    sudut.setdefault(k, []).append(i)
for k in sorted(sudut):
    print(f'== SUDUT {k} ({len(sudut[k])} widget) ==')
    for i in sorted(sudut[k], key=lambda x: (int(x['z']) if x['z'] else 0)):
        print(f"  id={i['id']:<28} L={i['left'] or '-':<4} R={i['right'] or '-':<4} B={i['bottom'] or '-':<4} T={i['top'] or '-':<4} z={i['z'] or '-'}")
json.dump(items, open('/home/z/my-project/scripts/ui/inventaris_fixed.json', 'w'), indent=1)
print('\nJSON -> scripts/ui/inventaris_fixed.json')
