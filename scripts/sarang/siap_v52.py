#!/usr/bin/env python3
# ============================================================
# SIAP V52 — sandbox uji V262-IMPAS-CERDAS dengan data live nyata:
#   siklus 1 penuh otak server (penjaga.mjs v5.8) di sandbox /tmp/v262;
#   backdate 25 jam → siklus 2 menilai vonis matang (lapis lama tetap jalan;
#   impas: zona-chase/karantina/alokasi mengikat, stop/target wajib lahir).
# Periksa: registri 254 (impas 22), impas.json (4 kasus + backtest),
#   e.impas per entri + stop/target TIDAK boleh null + sumberStop,
#   denyut.impas, buku-tekok impas, lapis lama (claw/kaizen/auto) tetap hidup.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v262'
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'
SUMBER_PENJAGA = '/home/z/my-project/micaprofita/scripts/penjaga.mjs'
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
        if any(k in baris for k in ('[PENJAGA]', 'RINGKASAN', 'impas-')):
            print(' ', baris[:220])
    if p.returncode != 0:
        print(p.stderr[-4000:])
        sys.exit(1)
    return p

# ---- siklus 1 ----
jalankan('siklus 1')

w = json.load(open(f'{SAND}/laporan/wawasan.json'))
reg = w.get('registri', {})
im = json.load(open(f'{SAND}/laporan/impas.json'))
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('\n=== HASIL SIKLUS 1 V262 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 254) | claw:', reg.get('claw'), '| impas:', reg.get('impas'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
print('impas.konstanta ZONA_CHASE:', im.get('konstanta', {}).get('ZONA_CHASE'), '| KALIB_AMBANG:', im.get('konstanta', {}).get('KALIB_AMBANG'), '| KUOTA_FLOOR:', im.get('konstanta', {}).get('KUOTA_FLOOR'))
bt = im.get('backtest', {})
print('impas.backtest: baseline', bt.get('baseline'), '→ zonaSaja', bt.get('zonaSaja'), '→ kalibrasiSaja', bt.get('kalibrasiSaja'))
j4 = im.get('jawaban4Kasus', {})
print('jawaban4Kasus:', ', '.join(f"{k}={v.get('status')}" for k, v in j4.items()))
si = im.get('siklusIni', {})
print('impas.siklusIni:', json.dumps(si, ensure_ascii=False)[:300])
# periksa entri terkunci baru: lapis impas + stop/target wajib
terbaru = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-30:]
hari = s.get('dihasilkan', '')[:10]
baru_im = [e for e in terbaru if e.get('impas') and (e.get('waktuKunci') or '').startswith(hari)]
print('entri baru dengan lapis impas:', len(baru_im))
if baru_im:
    e0 = baru_im[-1]
    pp = e0.get('paramsPenuh') if isinstance(e0.get('paramsPenuh'), dict) else {}
    i0 = e0.get('impas', {})
    print('contoh:', e0['simbol'], e0['arah'], '| stop:', e0.get('stop'), '| target:', e0.get('target'), '| sumberStop:', e0.get('sumberStop'))
    print('  impas.zona:', i0.get('zona'), '| keyTerkalib:', i0.get('keyakinanTerkalibrasi'), '| faktor:', i0.get('faktorKalib'), '| kuotaJalur:', i0.get('kuotaJalur'))
    print('  param impas di paramsPenuh:', {k: pp[k] for k in ('zona', 'kalib', 'alokasi') if k in pp})
    telanjang = [e for e in baru_im if not e.get('stop') or not e.get('target')]
    print('  ⚠ entri baru tanpa stop/target:', len(telanjang))
sekolah = w.get('sekolahParameter', [])
imParams = [x for x in sekolah if x.get('param') in ('zona', 'kalib', 'alokasi')]
print('sekolah param impas:', [(x['param'], x.get('n')) for x in imParams])
den1 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.impas:', json.dumps(den1.get('impas', {}), ensure_ascii=False)[:260])
keadaan1 = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
print('lapis lama hidup: claw.bukuTekok', (keadaan1.get('claw', {}) or {}).get('bukuTekok'))

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

im2 = json.load(open(f'{SAND}/laporan/impas.json'))
w2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
print('\n=== HASIL SIKLUS 2 (penilaian matang) ===')
si2 = im2.get('siklusIni', {})
print('impas.siklusIni siklus2:', json.dumps(si2, ensure_ascii=False)[:300])
reg2 = w2.get('registri', {})
print('registri siklus2:', reg2.get('totalNama'), '| impas:', reg2.get('impas'))
terbaru2 = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()][-30:]
hari2 = si2.get('dihasilkan') or im2.get('dihasilkan', '')[:10]
baru2 = [e for e in terbaru2 if e.get('impas')]
telanjang2 = [e for e in baru2 if not e.get('stop') or not e.get('target')]
print('entri impas siklus2:', len(baru2), '| tanpa stop/target:', len(telanjang2))
den2 = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
print('denyut.impas siklus2:', json.dumps(den2.get('impas', {}), ensure_ascii=False)[:260])

# ---- SIMPULAN ----
print('\n=== SIMPULAN ===')
ok = []
ok.append(('registri 254', reg2.get('totalNama') == 254))
ok.append(('impas=22', reg2.get('impas') == 22))
ok.append(('impas.json hidup', bool(im2.get('jawaban4Kasus'))))
ok.append(('stop/target wajib (siklus1)', len(baru_im) > 0 and all(e.get('stop') and e.get('target') for e in baru_im)))
ok.append(('stop/target wajib (siklus2)', len(baru2) > 0 and all(e.get('stop') and e.get('target') for e in baru2)))
ok.append(('denyut.impas hidup', bool(den2.get('impas'))))
ok.append(('faktor kalibrasi hidup', si2.get('faktorKalibArah') is not None and si2.get('faktorKalibPhx') is not None))
for nama, lulus in ok:
    print(('LULUS ' if lulus else 'GAGAL ') + nama)
print('SIMPULAN:', 'LULUS' if all(l for _, l in ok) else 'PERIKSA MANUAL')
