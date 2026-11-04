#!/usr/bin/env python3
# ============================================================
# SIAP V50 — sandbox uji V260-AUTOPILOT-KALIBRASI dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v5.6) di sandbox /tmp/v260;
#   backdate 25 jam → siklus 2 menilai vonis matang (timbangan-alt, kelly,
#   rezim-medan, peluang, stres + lapis kaizen/gekko lama tetap jalan).
# Periksa: registri 191 (auto 24), autopilot.json, e.auto per kandidat
#   (peluang/slip/kelly/alt/rezim/stres), denyut.auto, baseline σ mandiri.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v260'
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
ap = json.load(open(f'{SAND}/laporan/autopilot.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V260 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 191) | gekko:', reg.get('gekko'), '| kaizen:', reg.get('kaizen'), '| auto:', reg.get('auto'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('autopilot.identitas:', ap.get('identitas', {}).get('nama'), '/', ap.get('identitas', {}).get('repo'))
print('autopilot.sumber:', len(ap.get('sumber', [])), 'URL | kunciDiadopsi:', len(ap.get('kunciDiadopsi', [])))
print('autopilot.konstanta.bobot:', ap.get('konstanta', {}).get('bobot'))
si = ap.get('siklusIni', {})
print('autopilot.siklusIni: dd', si.get('ddPct'), '| rezim', (si.get('rezimMedan') or {}).get('rezim'), '| stres', (si.get('stres') or {}).get('terburuk'), '| baselineSigma', si.get('baselineSigma'))
print('autopilot.topTolakSiklus:', si.get('topTolakSiklus'))
# periksa entri terkunci baru: lapis autopilot
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-25:]
hari = s.get('dihasilkan', '')[:10]
baru_ap = [e for e in terbaru if e.get('auto') and (e.get('waktuKunci') or '').startswith(hari)]
print('entri baru dengan lapis autopilot:', len(baru_ap))
if baru_ap:
    e0 = baru_ap[-1]
    pp = e0.get('paramsPenuh') if isinstance(e0.get('paramsPenuh'), dict) else {}
    a0 = e0.get('auto', {})
    print('contoh:', e0['simbol'], e0['arah'], '| peluang:', (a0.get('peluang') or {}).get('skor'), '| slipPct:', a0.get('slip', {}).get('slipPct'), '| edgeBersih:', a0.get('slip', {}).get('edgeBersih'))
    print('  kelly:', (a0.get('kelly') or {}).get('mult'), 'faktor:', (a0.get('kelly') or {}).get('f'), '| ku:', (a0.get('kelly') or {}).get('ku'))
    print('  rezimMedan:', a0.get('rezimMedan'), a0.get('rezimMult'), '| stres:', a0.get('stresSkenario'), a0.get('stresTerkburuk'))
    print('  alt:', json.dumps(a0.get('alt'), ensure_ascii=False)[:180])
    print('  ekspresi.skalaEfektif:', (e0.get('ekspresi') or {}).get('skalaEfektif'), 'dari skala', (e0.get('ekspresi') or {}).get('skala'))
    print('  param autopilot di paramsPenuh:', {k: pp[k] for k in ('peluang', 'slipPct', 'kellyMult') if k in pp})
den1 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.auto:', json.dumps(den1.get('auto', {}), ensure_ascii=False)[:240])
keadaan1 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
print('keadaan.auto (baseline σ mandiri):', keadaan1.get('auto'))

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

ap2 = json.load(open(f'{SAND}/laporan/autopilot.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
print('\n=== HASIL SIKLUS 2 (penilaian matang) ===')
print('autopilot.medan.alt:', json.dumps(ap2.get('medan', {}).get('alt', {}), ensure_ascii=False)[:200])
print('autopilot.medan.kelly:', json.dumps(ap2.get('medan', {}).get('kelly', {}), ensure_ascii=False)[:200])
print('autopilot.medan.rezimMedan:', json.dumps(ap2.get('medan', {}).get('rezimMedan', {}), ensure_ascii=False)[:200])
print('autopilot.medan.peluang:', json.dumps(ap2.get('medan', {}).get('peluang', {}), ensure_ascii=False)[:200])
print('autopilot.medan.stres:', json.dumps(ap2.get('medan', {}).get('stres', {}), ensure_ascii=False)[:200])
print('autopilot.topTolakKumulatif:', ap2.get('siklusIni', {}).get('topTolakKumulatif'))
sk2 = w2.get('sekolahParameter', [])
apParams = [x for x in sk2 if x.get('param') in ('peluang', 'slipPct', 'kellyMult')]
print('sekolah param autopilot:', [(x['param'], x['n']) for x in apParams])
den2 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.auto siklus2:', json.dumps(den2.get('auto', {}), ensure_ascii=False)[:240])
keadaan2 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
# altMedan pada entri matang
matang_ap = 0
for l in open(f'{SAND}/laporan/prakira-server.jsonl'):
    if not l.strip():
        continue
    e = json.loads(l)
    if e.get('altMedan'):
        matang_ap += 1
print('entri dgn altMedan (regret pilihan terukur):', matang_ap)

ok = (reg.get('totalNama') == 191 and reg.get('auto') == 24 and ap.get('identitas', {}).get('nama') == 'AutoPilotPM'
      and len(ap.get('sumber', [])) == 8 and len(ap.get('kunciDiadopsi', [])) == 7
      and len(baru_ap) > 0)
# catatan: baseline σ mandiri mengalibrasi pada denyut PERTAMA setelah netHist >= 4
# (mulai jujur dari kekaburan — window kosong = normal-awas). Setelah 2 siklus,
# netHist harus sudah berisi >= 4 net vonis agar kalibrasi jalan di denyut berikutnya.
nethist_n = len(keadaan2.get('kaizen', {}).get('netHist', []))
print('netHist setelah 2 siklus:', nethist_n, '(>= 4 → baseline σ akan mengalibrasi denyut berikutnya)')
ok = ok and nethist_n >= 4
print('\nSIMPULAN:', 'LULUS' if ok else 'PERIKSA MANUAL — lihat detail di atas')
sys.exit(0 if ok else 2)
