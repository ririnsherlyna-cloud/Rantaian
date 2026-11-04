#!/usr/bin/env python3
# ============================================================
# SIAP V51 — sandbox uji V261-CLAW-TEMPOK dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v5.7) di sandbox /tmp/v261;
#   backdate 25 jam → siklus 2 menilai vonis matang (lapis gekko/kaizen/
#   autopilot lama tetap jalan; claw: komite/kartu/kuanta tersegel per entri).
# Periksa: registri 232 (claw 41), clawtrade.json (8 sumber + 8 kunci),
#   e.claw per entri (komite 5 suara/kartu 4×25/kuanta), denyut.claw,
#   keadaan.claw (bukuTekok/hitam/konfirm), gerbang claw di buku-tekok.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v261'
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
cl = json.load(open(f'{SAND}/laporan/clawtrade.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V261 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 232) | gekko:', reg.get('gekko'), '| kaizen:', reg.get('kaizen'), '| auto:', reg.get('auto'), '| claw:', reg.get('claw'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('clawtrade.konstanta KARTU_MAKS:', cl.get('konstanta', {}).get('KARTU_MAKS'), '| KUOTA_HARIAN:', cl.get('konstanta', {}).get('KUOTA_HARIAN'), '| KOMITE_MINCONF:', cl.get('konstanta', {}).get('KOMITE_MINCONF'))
print('clawtrade.sumber:', len(cl.get('sumber', [])), 'URL | kunci:', len(cl.get('kunci', [])))
si = cl.get('siklusIni', {})
print('clawtrade.siklusIni: komiteVeto', si.get('komiteVeto'), '| kartuVeto', si.get('kartuVeto'), '| kuantaVeto', si.get('kuantaVeto'), '| kuota', si.get('kuota'), '| hitamAktif', si.get('hitamAktif'), '| mandat antre', si.get('konfirmAntre'))
print('clawtrade.bukuTekok:', si.get('bukuTekok'))
# periksa entri terkunci baru: lapis claw
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-25:]
hari = s.get('dihasilkan', '')[:10]
baru_cl = [e for e in terbaru if e.get('claw') and (e.get('waktuKunci') or '').startswith(hari)]
print('entri baru dengan lapis claw:', len(baru_cl))
if baru_cl:
    e0 = baru_cl[-1]
    pp = e0.get('paramsPenuh') if isinstance(e0.get('paramsPenuh'), dict) else {}
    c0 = e0.get('claw', {})
    print('contoh:', e0['simbol'], e0['arah'], '| komite:', (c0.get('komite') or {}).get('arah'), (c0.get('komite') or {}).get('keyakinan'), '| terbaca:', (c0.get('komite') or {}).get('terbaca'))
    print('  suara komite:', [(x.get('nama'), x.get('arah'), x.get('keyakinan'), x.get('anggota')) for x in (c0.get('komite') or {}).get('suara', [])])
    print('  kartu:', (c0.get('kartu') or {}).get('skor'), (c0.get('kartu') or {}).get('level'), 'faktor:', (c0.get('kartu') or {}).get('faktor'), 'approved:', (c0.get('kartu') or {}).get('approved'))
    print('  kuanta:', c0.get('kuanta'), '| konfirm:', c0.get('konfirm'))
    print('  ekspresi.skalaEfektif:', (e0.get('ekspresi') or {}).get('skalaEfektif'), '(ditambat kuanta/ukuran-maks)')
    print('  param claw di paramsPenuh:', {k: pp[k] for k in ('komite', 'kartu', 'kuanta') if k in pp})
# kartu kandidat di wawasan (param komite/kartu disekolahkan)
sekolah = w.get('sekolahParameter', [])
clParams = [x for x in sekolah if x.get('param') in ('komite', 'kartu', 'kuanta')]
print('sekolah param claw:', [(x['param'], x.get('n')) for x in clParams])
den1 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.claw:', json.dumps(den1.get('claw', {}), ensure_ascii=False)[:260])
keadaan1 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
kcl = keadaan1.get('claw', {})
print('keadaan.claw: bukuTekok', kcl.get('bukuTekok'), '| hitam', list((kcl.get('hitam') or {}).keys()), '| konfirm pending', sum(1 for q in (kcl.get('konfirm') or []) if q.get('status') == 'pending'))

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

cl2 = json.load(open(f'{SAND}/laporan/clawtrade.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
print('\n=== HASIL SIKLUS 2 (penilaian matang) ===')
si2 = cl2.get('siklusIni', {})
print('clawtrade.siklusIni siklus2: komiteVeto', si2.get('komiteVeto'), '| kartuVeto', si2.get('kartuVeto'), '| kuantaVeto', si2.get('kuantaVeto'), '| kuota', si2.get('kuota'), '| slipMaks', si2.get('slipMaks'), '| hitam', si2.get('hitamAktif'), '| mandat antre', si2.get('konfirmAntre'), '| mandat lolos', si2.get('konfirmOk'), '| mandat kadaluarsa', si2.get('konfirmExp'))
print('bukuTekok kumulatif:', si2.get('bukuTekok'))
reg2 = w2.get('registri', {})
sekolah2 = w2.get('sekolahParameter', [])
clParams2 = [x for x in sekolah2 if x.get('param') in ('komite', 'kartu', 'kuanta')]
print('registri siklus2:', reg2.get('totalNama'), '| claw:', reg2.get('claw'), '| sekolah claw:', [(x['param'], x.get('n')) for x in clParams2])
den2 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.claw siklus2:', json.dumps(den2.get('claw', {}), ensure_ascii=False)[:260])
# entri dengan komite suara lengkap
denganSuara = 0
for l in open(f'{SAND}/laporan/prakira-server.jsonl'):
    if not l.strip():
        continue
    e = json.loads(l)
    su = ((e.get('claw') or {}).get('komite') or {}).get('suara') or []
    if len(su) == 5:
        denganSuara += 1
print('entri dgn komite 5 suara lengkap:', denganSuara)

ok = (reg.get('totalNama') == 232 and reg.get('claw') == 41
      and len(cl.get('sumber', [])) == 8 and len(cl.get('kunci', [])) == 8
      and cl.get('konstanta', {}).get('KARTU_MAKS') == 70)
print('\nSIMPULAN:', 'LULUS' if ok else 'PERIKSA MANUAL — lihat detail di atas')
sys.exit(0 if ok else 2)
