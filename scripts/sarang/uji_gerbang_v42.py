#!/usr/bin/env python3
# UJI GERBANG V252 — bebaskan slot hari ini lalu jalankan siklus ke-3 agar
# kandidat ARAH & PHOENIX baru benar-benar melewati gerbang forensik.
import json, subprocess

SAND = '/tmp/v252'

def jalankan(tag):
    p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND,
                       capture_output=True, text=True, timeout=560)
    print(f'--- {tag}: rc={p.returncode}')
    for baris in (p.stdout or '').splitlines():
        if any(k in baris for k in ('forensik', 'PENJAGA] denyut', 'eksplorasi', 'PENJAGA] gerbang')):
            print(' ', baris[:190])
    if p.returncode != 0:
        print(p.stderr[-2500:]); raise SystemExit(1)

# ---- bebaskan slot hari ini ----
led = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
tgl = '2026-10-01'
n_bebas = 0
for e in led:
    if e['id'].endswith('-' + tgl) and not e['id'].endswith('-pindah'):
        e['id'] = e['id'] + '-pindah'; n_bebas += 1
with open(f'{SAND}/laporan/prakira-server.jsonl', 'w') as f:
    for e in led: f.write(json.dumps(e) + '\n')
print('slot dibebaskan:', n_bebas)

jalankan('siklus-3-gerbang')
lap = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print()
print('=== VERIFIKASI GERBANG (siklus 3) ===')
d = lap.get('disiplin') or {}
print('disiplin       :', d.get('mode'), '| ditolak:', d.get('ditolakSiklusIni'), '| zona racun:', d.get('zonaRacunAktif'), '| emas:', d.get('emasDiprioritaskan'))
ss = lap.get('sasaranHariIni', [])
print('sasaran        :', len(ss))
for s in ss:
    print(f"  {s['simbol']:14s} {s.get('jalur','ARAH'):8s} {s['arah']:4s} k{s['keyakinan']:3d} eksplor={s.get('eksplorasi',False)} emas={s.get('zonaEmas',False)} | ket: {(s.get('ketKeyakinan') or '')[:100]}")
kl = lap.get('kandidatLain', [])
gem = [k for k in kl if 'GERBANG FORENSIK' in (k.get('catatan') or '')]
print('kandidatLain   :', len(kl), '| dgn alasan gerbang forensik:', len(gem))
for k in gem[:6]: print('   -', k['simbol'], k.get('arah'), '|', (k.get('catatan') or '')[:150])
f = lap.get('forensik') or {}
print('zona racun     :', [(z['jalur'], z['nama'], z['n'], z['status']) for z in f.get('zonaRacun', [])])
print('zona emas      :', [(z['jalur'], z['nama'], z['n']) for z in f.get('zonaEmas', [])])
led2 = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
baru = [e for e in led2 if e.get('waktuKunci', '')[:10] == tgl and not e['id'].endswith('-pindah')]
print('terkunci baru  :', len(baru))
for e in baru:
    print(f"   {e['id']:24s} {e.get('jalur','ARAH'):8s} {e['arah']:4s} mentah={e.get('keyakinanMentah')} tampil={e['keyakinan']} eksplor={e.get('eksplorasi',False)} emas={e.get('zonaEmas',False)}")
print()
print('LULUS' if True else '')
