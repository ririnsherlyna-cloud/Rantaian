#!/usr/bin/env python3
# ============================================================
# SIAP V49 — sandbox uji V259-KAIZEN-PULIH dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v5.5) di sandbox /tmp/v259;
#   backdate 25 jam → siklus 2 menilai vonis matang (karantina topik,
#   dingin-dendam, uji-balik, pengawas, modal-mati, kesegaran, tesis).
# Periksa: registri 167, kaizen.json, param kaizen per kandidat,
#   pengawas di rencanaDeal, uji-balik status, denyut.kaizen.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v259'
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
kz = json.load(open(f'{SAND}/laporan/kaizen.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V259 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 167) | gekko:', reg.get('gekko'), '| kaizen:', reg.get('kaizen'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('kaizen.siklusIni.ujiBalik:', kz.get('siklusIni', {}).get('ujiBalik'))
print('kaizen.siklusIni.hentiHarian:', kz.get('siklusIni', {}).get('hentiHarian'))
print('kaizen.siklusIni.pompaTuaDitolak:', kz.get('siklusIni', {}).get('pompaTuaDitolak'))
print('kaizen.konstanta:', json.dumps(kz.get('konstanta', {}), ensure_ascii=False)[:200])
# periksa entri terkunci baru: lapis kaizen + pengawas + rencanaDeal.exitEkstra
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-25:]
hari = s.get('dihasilkan', '')[:10]
baru_kz = [e for e in terbaru if e.get('kaizen') and (e.get('waktuKunci') or '').startswith(hari)]
print('entri baru dengan lapis kaizen:', len(baru_kz))
if baru_kz:
    e0 = baru_kz[-1]
    pp = e0.get('paramsPenuh') if isinstance(e0.get('paramsPenuh'), dict) else {}
    print('contoh:', e0['simbol'], e0['arah'], '| kaizen.kesegaran:', e0.get('kaizen', {}).get('kesegaran'), '| aks1:', e0.get('kaizen', {}).get('aks1'), '| c24:', e0.get('kaizen', {}).get('c24'), '| tesisSehat:', e0.get('kaizen', {}).get('tesisSehat'))
    print('  pengawas:', e0.get('kaizen', {}).get('pengawas'))
    print('  param kaizen di paramsPenuh:', {k: pp[k] for k in ('kesegaran', 'akselerasi1j', 'tesisSehat') if k in pp})
    print('  rencanaDeal.pengawas:', (e0.get('rencanaDeal') or {}).get('pengawas', {}).get('stopPct'), '| exitEkstra.chopExit:', (e0.get('rencanaDeal') or {}).get('exitEkstra', {}).get('chopExit', {}).get('umurMaksJam'))
odds = json.load(open(f'{SAND}/laporan/odds.json'))
print('odds.json OK: kunci', len([x for x in odds.get('oddsSiklusIni', []) if x.get('terkunci')]), '/', len(odds.get('oddsSiklusIni', [])))
den1 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.kaizen:', json.dumps(den1.get('kaizen', {}), ensure_ascii=False)[:220])

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

kz2 = json.load(open(f'{SAND}/laporan/kaizen.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
s2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 2 (penilaian matang) ===')
print('kaizen.siklusIni.ujiBalik:', kz2.get('siklusIni', {}).get('ujiBalik'))
print('kaizen.siklusIni.revertCt/lolosCt:', kz2.get('siklusIni', {}).get('revertCt'), '/', kz2.get('siklusIni', {}).get('lolosCt'))
print('kaizen.medan.pengawas:', kz2.get('medan', {}).get('pengawas'))
print('kaizen.medan.kesegaran:', json.dumps(kz2.get('medan', {}).get('kesegaran', {}), ensure_ascii=False)[:180])
print('kaizen.medan.modalMati:', json.dumps(kz2.get('medan', {}).get('modalMati', {}), ensure_ascii=False)[:180])
print('kaizen.medan.tesis:', json.dumps(kz2.get('medan', {}).get('tesis', {}), ensure_ascii=False)[:180])
keadaan2 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
ka2 = keadaan2.get('kaizen', {})
print('keadaan.kaizen keys:', sorted(ka2.keys()))
print('dingin aktif:', {s: v for s, v in (ka2.get('dingin') or {}).items() if v.get('dinginSampai', 0) > time.time() * 1000})
print('dinginFam:', ka2.get('dinginFam'))
sk2 = w2.get('sekolahParameter', [])
kzParams = [x for x in sk2 if x.get('param') in ('kesegaran', 'akselerasi1j', 'tesisSehat')]
print('sekolah param kaizen:', [(x['param'], x['n']) for x in kzParams])
den2 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.kaizen siklus2:', json.dumps(den2.get('kaizen', {}), ensure_ascii=False)[:220])

ok = (reg.get('totalNama') == 167 and reg.get('kaizen') == 22 and kz.get('siklusIni')
      and len(kz.get('kunciDiadopsi', [])) == 8 and len(baru_kz) > 0
      and kz2.get('medan', {}).get('pengawas', {}).get('dinilai', 0) > 0
      and kz2.get('medan', {}).get('kesegaran', {}).get('tinggi', {}).get('n', 0) + kz2.get('medan', {}).get('kesegaran', {}).get('rendah', {}).get('n', 0) > 0
      and 'uji' in ka2)
print('\nSIMPULAN:', 'LULUS' if ok else 'PERIKSA-LAGI')
sys.exit(0 if ok else 2)
