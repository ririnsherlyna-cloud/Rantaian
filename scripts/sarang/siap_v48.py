#!/usr/bin/env python3
# ============================================================
# SIAP V48 — sandbox uji V258-GEKKO-CZAR dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v5.4) di sandbox /tmp/v258;
#   backdate 25 jam → siklus 2 menilai vonis matang (CZAR, topik-regret,
#   ekspresi, divergensi terisi). Periksa: registri 145, gekko.json,
#   suhu autopilot, sidikPrakunci, param gekko per kandidat.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v258'
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'
STATE = {
    'otak/genome-server.json': f'{SAND}/otak/genome-server.json',
    'otak/penjaga-keadaan.json': f'{SAND}/otak/penjaga-keadaan.json',
    'laporan/prakira-server.jsonl': f'{SAND}/laporan/prakira-server.jsonl',
    'laporan/pelajaran-server.json': f'{SAND}/laporan/pelajaran-server.json',
    'laporan/denyut-server.jsonl': f'{SAND}/laporan/denyut-server.jsonl',
    'laporan/jurnal-ilmu.json': f'{SAND}/laporan/jurnal-ilmu.json',
}

def unduh(jalan, tujuan):
    with urllib.request.urlopen(RAW + jalan, timeout=30) as r:
        isi = r.read()
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    open(tujuan, 'wb').write(isi)
    return len(isi)

shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy('/home/z/my-project/scripts/penjaga.mjs', f'{SAND}/scripts/penjaga.mjs')
n_ok = 0
for jalan, tujuan in STATE.items():
    try:
        n = unduh(jalan, tujuan)
        n_ok += 1
        print(f'unduh {jalan}: {n} B')
    except Exception as e:
        print(f'unduh {jalan} gagal ({e}) — sandbox mulai kosong untuk file ini')
print(f'state: {n_ok}/{len(STATE)}')

def jalankan(label):
    p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
    print(f'--- {label}: rc={p.returncode}')
    for baris in (p.stdout or '').splitlines():
        if baris.startswith('[PENJAGA]') or baris.startswith('RINGKASAN'):
            print(' ', baris[:200])
    if p.returncode != 0:
        print(p.stderr[-4000:])
        sys.exit(1)
    return p

# ---- siklus 1 ----
jalankan('siklus 1')

w = json.load(open(f'{SAND}/laporan/wawasan.json'))
reg = w.get('registri', {})
gk = json.load(open(f'{SAND}/laporan/gekko.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V258 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 145) | gekko:', reg.get('gekko'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('gekko.suhuSiklusIni:', json.dumps(gk.get('suhuSiklusIni', {}), ensure_ascii=False)[:220])
print('gekko.topik:', [(t['topik'], t['bobotKini'], t['status']) for t in gk.get('topik', [])])
print('gekko.czar:', gk.get('czar'))
akp = s.get('akurasi', {}).get('profit', {})
print('akurasi.profit.impasPct:', akp.get('impasPct'), '| darahAkurasi:', akp.get('darahAkurasi'), '| czarRata:', akp.get('czarRata'))
# periksa entri terkunci baru: sidikPrakunci + topik + ekspresi + param gekko
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-25:]
baru_gk = [e for e in terbaru if e.get('sidikPrakunci')]
print('entri dengan sidikPrakunci:', len(baru_gk), '| terkunci siklus ini:', len([e for e in terbaru if (e.get('waktuKunci') or '').startswith(json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))['dihasilkan'][:10])]))
if baru_gk:
    e0 = baru_gk[-1]
    print('contoh:', e0['simbol'], e0['arah'], '| topik:', e0.get('topik', {}).get('metaArah'), e0.get('topik', {}).get('metaKeyakinan'), '| probPasar:', e0.get('probPasar'), '| divergensi:', e0.get('divergensi'), '| ekspresi:', e0.get('ekspresi', {}).get('skala'), '| sidik:', str(e0.get('sidikPrakunci'))[:10])
    gk_params = [p['param'] for p in (e0.get('wawasan') or []) if p.get('lapis') == 'gekko']
    print('param gekko di wawasan entri:', gk_params)
odds = json.load(open(f'{SAND}/laporan/odds.json'))
print('odds.json OK: kunci', len([x for x in odds.get('oddsSiklusIni', []) if x.get('terkunci')]), '/', len(odds.get('oddsSiklusIni', [])))

# ---- backdate lalu siklus 2 (menilai matang) ----
kini = time.time() - 25 * 3600
for nama in ['laporan/prakira-server.jsonl']:
    pth = f'{SAND}/{nama}'
    out = []
    for l in open(pth):
        if not l.strip():
            continue
        try:
            e = json.loads(l)
        except Exception:
            out.append(l); continue
        if (e.get('waktuKunci') or '') >= time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(kini)):
            e['waktuKunci'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(kini - 3600))
            out.append(json.dumps(e) + '\n')
        else:
            out.append(l)
    open(pth, 'w').writelines(out)
k = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
if isinstance(k.get('epochTerakhir'), str) and k.get('epochTerakhir'):
    k['epochTerakhir'] = '2000-01-01'
    json.dump(k, open(f'{SAND}/otak/penjaga-keadaan.json', 'w'))

jalankan('siklus 2 (backdate 25j)')

gk2 = json.load(open(f'{SAND}/laporan/gekko.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
s2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 2 (penilaian matang) ===')
print('gekko.czar:', gk2.get('czar'))
print('gekko.topik (n/hit/regret):', [(t['topik'], t['n'], t['hitPct'], t['regret']) for t in gk2.get('topik', [])])
print('gekko.ekspresiMedan:', json.dumps(gk2.get('ekspresiMedan', {}), ensure_ascii=False)[:160])
print('gekko.divergensiMedan:', json.dumps(gk2.get('divergensiMedan', {}), ensure_ascii=False)[:160])
akp2 = s2.get('akurasi', {}).get('profit', {})
print('akurasi.profit:', {k2: akp2.get(k2) for k2 in ('ekspektasiPct', 'profitFactor', 'impasPct', 'darahAkurasi', 'czarRata')})
sk = w2.get('sekolahParameter', [])
dgnCz = [x for x in sk if x.get('czar') is not None]
print('sekolah param dengan czar:', len(dgnCz), '| contoh:', [(x['param'], x['n'], x.get('czar')) for x in dgnCz[:5]])

ok = (reg.get('totalNama') == 145 and reg.get('gekko') == 18 and gk.get('suhuSiklusIni')
      and len(gk.get('topik', [])) == 6 and len(baru_gk) > 0 and akp2.get('impasPct') is not None
      and gk2.get('czar', {}).get('n', 0) > 0)
print('\nSIMPULAN:', 'LULUS' if ok else 'PERIKSA-LAGI')
sys.exit(0 if ok else 2)
