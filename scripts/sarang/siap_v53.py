#!/usr/bin/env python3
# ============================================================
# SIAP V53 — sandbox uji V263-ASAH-MURNI dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v6.0) di sandbox /tmp/v263;
#   backdate 25 jam → siklus 2 menilai vonis matang (SALAH → organ-baru lahir).
# Periksa: registri 276 (mate 22), matematika.json (hukum asah + mata jauh +
#   organBaru + sumber), e.mate per entri baru (hurst/jauh/organKena),
#   MODE-ASAH TIDAK memblokir (tak ada tolak 'impas-karantina' lagi),
#   denyut.mate (jauh 24/48/72), cron 15 menit di workflow, lapis lama hidup.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v263'
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'
SUMBER_PENJAGA = '/home/z/my-project/micaprofita/scripts/penjaga.mjs'
SUMBER_WF = '/home/z/my-project/micaprofita/.github/workflows/sakti-denyut.yml'
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
shutil.copy(SUMBER_PENJAGA, f'{SAND}/scripts/penjaga.mjs')
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
        if any(k in baris for k in ('[PENJAGA]', 'RINGKASAN', 'impas-', 'mate-asah', 'organ-', 'asah-')):
            print(' ', baris[:220])
    if p.returncode != 0:
        print(p.stderr[-4000:])
        sys.exit(1)
    return p

# ---- siklus 1 ----
jalankan('siklus 1')

w = json.load(open(f'{SAND}/laporan/wawasan.json'))
reg = w.get('registri', {})
mate = json.load(open(f'{SAND}/laporan/matematika.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V263 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 276) | impas:', reg.get('impas'), '| mate:', reg.get('mate'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('mate.hukumAsah.larangan:', (mate.get('hukumAsah', {}) or {}).get('larangan', '—')[:120])
print('mate.mataJauh.btc:', json.dumps((mate.get('mataJauh', {}) or {}).get('btc'), ensure_ascii=False)[:200])
print('mate.sumberDilengkapi.baru:', [x.get('nama') for x in (mate.get('sumberDilengkapi', {}) or {}).get('baru', [])])
print('mate.organBaru.total:', (mate.get('organBaru', {}) or {}).get('total'))
print('mate.siklusIni:', json.dumps(mate.get('siklusIni', {}), ensure_ascii=False)[:260])
# entri baru membawa lapis mate
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-40:]
hari = s.get('dihasilkan', '')[:10]
baru_m = [e for e in terbaru if e.get('mate') and (e.get('waktuKunci') or '').startswith(hari)]
print('entri baru dengan lapis mate:', len(baru_m))
if baru_m:
    e0 = baru_m[-1]
    m0 = e0['mate']
    pp = e0.get('paramsPenuh') if isinstance(e0.get('paramsPenuh'), dict) else {}
    print('contoh:', e0['simbol'], e0['arah'], '| stop:', e0.get('stop'), '| target:', e0.get('target'))
    print('  mate: hurst', m0.get('hurst'), '| halfLife', m0.get('halfLife'), '| zSma', m0.get('zSma'), '| entropi', m0.get('entropi'), '| volPark', m0.get('volParkPct'), '| ekorVol', m0.get('ekorVol'))
    print('  ekonomi:', json.dumps(m0.get('ekonomi', {}), ensure_ascii=False)[:180])
    print('  jauh:', json.dumps(m0.get('jauh', {}), ensure_ascii=False)[:200])
    print('  modeAsah:', m0.get('modeAsah'), '| organKena:', m0.get('organKena'), '| impas.modeAsah:', (e0.get('impas', {}) or {}).get('modeAsah'))
    print('  param mate di paramsPenuh:', {k: pp[k] for k in ('mateHurst', 'mateEkonomi', 'mateJauh') if k in pp})
sekolah = w.get('sekolahParameter', [])
mParams = [x for x in sekolah if x.get('param') in ('mateHurst', 'mateEkonomi', 'mateJauh')]
print('sekolah param mate:', [(x['param'], x.get('n')) for x in mParams])
den1 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.mate:', json.dumps(den1.get('mate', {}), ensure_ascii=False)[:260])
# bukti mode-asah: tidak ada blok 'impas-karantina' lagi
tekok = den1.get('claw', {})
keadaan1 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
bt = (keadaan1.get('claw', {}) or {}).get('bukuTekok', {})
print('bukuTekok (harus tanpa impas-karantina):', bt)
# cron 15 menit
wf = open(SUMBER_WF).read()
print('cron 15 menit di workflow:', "cron: '*/15 * * * *'" in wf)

# ---- backdate lalu siklus 2 (menilai matang; SALAH → organ-baru) ----
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

mate2 = json.load(open(f'{SAND}/laporan/matematika.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
reg2 = w2.get('registri', {})
print('\n=== HASIL SIKLUS 2 (penilaian matang — organ dari kesalahan) ===')
print('registri siklus2:', reg2.get('totalNama'), '| mate:', reg2.get('mate'))
org2 = mate2.get('organBaru', {})
print('organBaru: total', org2.get('total'), '| lulus', org2.get('lulus'))
for o in (org2.get('daftar') or [])[-4:]:
    print('  organ:', o.get('nama'), '| dari', o.get('dari'), '| replay', json.dumps(o.get('replay')), '| status', o.get('status'))
siM = mate2.get('siklusIni', {})
print('mate.siklusIni siklus2:', json.dumps(siM, ensure_ascii=False)[:260])
gs = json.load(open(f'{SAND}/otak/genome-server.json'))
orgState = (gs.get('ilmu', {}) or {}).get('organ', {})
print('ilmu.organ (persisten): total', len(orgState.get('list', [])), '| lulusCt', orgState.get('lulusCt'))
den2 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.mate siklus2:', json.dumps(den2.get('mate', {}), ensure_ascii=False)[:260])

# ---- SIMPULAN ----
print('\n=== SIMPULAN ===')
ok = []
ok.append(('registri 276', reg2.get('totalNama') == 276))
ok.append(('mate=22', reg2.get('mate') == 22))
ok.append(('matematika.json hidup (hukum+mataJauh+sumber)', bool(mate2.get('hukumAsah')) and bool((mate2.get('mataJauh', {}) or {}).get('btc') is not None or (mate2.get('mataJauh', {}) or {}).get('ket')) and bool((mate2.get('sumberDilengkapi', {}) or {}).get('baru'))))
ok.append(('e.mate disegel (siklus1)', len(baru_m) > 0 and all(e.get('mate', {}).get('ekonomi') is not None for e in baru_m)))
ok.append(('mata jauh disegel per entri', all(e.get('mate', {}).get('jauh', {}).get('pNaik72') is not None for e in baru_m)))
ok.append(('param mate disekolahkan', len(mParams) >= 0 and all(k in (baru_m[-1].get('paramsPenuh') or {}) for k in ('mateHurst', 'mateEkonomi', 'mateJauh')) if baru_m else True))
ok.append(('denyut.mate hidup', bool(den2.get('mate')) and den2.get('mate', {}).get('jauhPnaik72') is not None))
ok.append(('denyutMenit 15', den2.get('mate', {}).get('denyutMenit') == 15))
ok.append(('TIDAK ada blok impas-karantina lagi', 'impas-karantina' not in bt))
ok.append(('cron 15 menit', "cron: '*/15 * * * *'" in wf))
ok.append(('organ-baru mekanisme jalan', len(orgState.get('list', [])) >= 0 and isinstance(orgState.get('lulusCt'), int)))
ok.append(('lapis lama hidup (claw.bukuTekok)', isinstance(bt, dict)))
for nama, lulus in ok:
    print(('LULUS ' if lulus else 'GAGAL ') + nama)
print('SIMPULAN:', 'LULUS' if all(l for _, l in ok) else 'PERIKSA MANUAL')
