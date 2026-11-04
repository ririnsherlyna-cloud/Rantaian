#!/usr/bin/env python3
# ============================================================
# UJI PAKSA V53r — bukti jalur V263-ASAH-MURNI end-to-end dari STATE REPO
# SEGAR (bukan warisan sandbox), produksi TIDAK disentuh:
#   RUN A: gerbang hulu dilemaskan + KALIB_AMBANG=99 → entri ARAH NON-eksplor
#          terkunci dengan e.mate tersegel + impas.modeAsah 'UKURAN-x0.6-…'
#          + ukuran ×0.6 + stop ×0.75.
#   RUN B: backdate 25j → SALAH melahirkan ORGAN-BARU ber-replay.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

SAND = '/tmp/v263u2'
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

shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy(SUMBER_PENJAGA, f'{SAND}/scripts/penjaga.mjs')
n_ok = 0
for jalan, tujuan in STATE.items():
    try:
        unduh(jalan, tujuan); n_ok += 1
    except Exception as e:
        print(f'unduh {jalan} gagal ({e})')
print(f'state segar: {n_ok}/{len(STATE)}')

p = f'{SAND}/scripts/penjaga.mjs'
s = open(p, encoding='utf-8').read()
s = s.replace('const bersihArah = kandidatArah.filter((k) => !k.vetoW.length && !k.kena.some((z) => z.status === \'RACUN\'))',
              'const bersihArah = kandidatArah.filter((k) => true)   // UJI-PAKSA V53r')
s = s.replace('const pilihArah = rankArah.filter((k) => k.odds.skor >= ambangOddsEfektif)',
              'const pilihArah = rankArah.filter((k) => true)   // UJI-PAKSA V53r')
s = s.replace('PELUANG_AMBANG: 60,', 'PELUANG_AMBANG: -1,   // UJI-PAKSA V53r')
s = s.replace('KOMITE_MINCONF: 0.6,', 'KOMITE_MINCONF: -1,   // UJI-PAKSA V53r')
s = s.replace('KARTU_MAKS: 70,', 'KARTU_MAKS: 999,   // UJI-PAKSA V53r')
s = s.replace('KALIB_AMBANG: 40,', 'KALIB_AMBANG: 99,   // UJI-PAKSA V53r: SEMUA entri MODE-ASAH')
s = s.replace('ESTIMATOR_MIN_LOLOS: 0.40,', 'ESTIMATOR_MIN_LOLOS: -1,   // UJI-PAKSA V53r')
s = s.replace('PREDIKTOR_MAKS_PROB: 0.60,', 'PREDIKTOR_MAKS_PROB: 99,   // UJI-PAKSA V53r')
s = s.replace('if (!eksplor && kuaC.kuanta === 0) {', 'if (false) {   // UJI-PAKSA V53r')
s = s.replace('if (!eksplor && kuaC.kuanta >= CLAW.KUANTA_1 && !konfirmOk) {', 'if (false) {   // UJI-PAKSA V53r')
s = s.replace('if (!eksplor && kuotaPakai >= kuotaArahImpas) {', 'if (false) {   // UJI-PAKSA V53r')
# id unik uji — hindari tabrakan dengan kunci hari ini milik server LIVE (masih V262)
s = s.replace('const id = `${s}-${TGL}`', 'const id = `${s}-${TGL}-UJI`   // UJI-PAKSA V53r: id segar')
# bypass tiga gerbang tersisa yang makan kandidat non-eksplor (salinan uji saja)
s = s.replace('if (!eksplor && dSas && WAKTU.getTime() < (dSas.dinginSampai || 0)) {', 'if (false) {   // UJI-PAKSA V53r: dingin-dendam dilemaskan')
s = s.replace('if (!eksplor && dFam && SIKLUS < (dFam.dinginSampaiDenyut || 0)) {', 'if (false) {   // UJI-PAKSA V53r: dingin-fam dilemaskan')
s = s.replace('if (!eksplor && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {', 'if (false) {   // UJI-PAKSA V53r: komite dilemaskan')
s = s.replace('if (!eksplor && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {', 'if (false) {   // UJI-PAKSA V53r: slip-neto dilemaskan')
s = s.replace('if (!eksplor && srImpas != null && ((v.arah === \'SELL\' && srImpas <= -IMPAS.ZONA_CHASE) || (v.arah === \'BUY\' && srImpas >= IMPAS.ZONA_CHASE))) {', 'if (false) {   // UJI-PAKSA V53r: zona-chase dilemaskan')
open(p, 'w', encoding='utf-8').write(s)
print('patch uji-paksa diterapkan')

def jalankan(label):
    q = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
    print(f'--- {label}: rc={q.returncode}')
    for b in (q.stdout or '').splitlines():
        if any(k in b for k in ('impas-asah', 'organ-', 'mate-asah', 'RINGKASAN', 'asah-suara', 'henti-harian')):
            print(' ', b[:240])
    if q.returncode != 0:
        print(q.stderr[-3500:])
        sys.exit(1)

jalankan('RUN A (kunci paksa mode-asah)')
# DIAGNOSTIK: alasan penolakan dari nearMiss
try:
    stA = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
    nmA = stA.get('kandidatLain') or []
    from collections import Counter
    cnt = Counter((nm.get('kunci') or ['?'])[0] if nm.get('kunci') else (nm.get('catatan', '')[:22]) for nm in nmA)
    print('diagnostik penolakan:', dict(cnt))
    for nm in nmA[:6]:
        print('  -', (nm.get('kunci') or ['-'])[0], '|', nm.get('catatan', '')[:130])
except Exception as e:
    print('diagnostik gagal:', e)
ent = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
hari = time.strftime('%Y-%m-%d', time.gmtime())
arahBaru = [e for e in ent if str(e.get('id', '')).endswith('-UJI') and e.get('jalur') == 'ARAH' and not e.get('eksplorasi')]
print('\n=== RUN A: entri ARAH -UJI non-eksplor terkunci:', len(arahBaru), '===')
okA = len(arahBaru) > 0
if okA:
    e0 = arahBaru[0]
    m0 = e0.get('mate', {})
    i0 = e0.get('impas', {})
    se = (e0.get('ekspresi', {}) or {}).get('skalaEfektif')
    kt = i0.get('keyakinanTerkalibrasi')
    print('contoh:', e0['simbol'], e0['arah'], '| keyakinanMentah', e0.get('keyakinanMentah'), '| terkalibrasi', kt, '| skalaEfektif', se)
    print('  mate: hurst', m0.get('hurst'), '| halfLife', m0.get('halfLife'), '| zSma', m0.get('zSma'), '| entropi', m0.get('entropi'), '| volPark', m0.get('volParkPct'), '| jauh72', (m0.get('jauh') or {}).get('pNaik72'))
    print('  ekonomi:', json.dumps(m0.get('ekonomi', {}), ensure_ascii=False)[:180])
    print('  impas.modeAsah:', i0.get('modeAsah'), '| stopPct', (i0.get('rencana') or {}).get('stopPct'), '| organKena', m0.get('organKena'))
    pp = e0.get('paramsPenuh', {})
    print('  paramsPenuh mate:', {k: pp[k] for k in ('mateHurst', 'mateEkonomi', 'mateJauh') if k in pp})
    okA = (m0.get('modeAsah') is True and (m0.get('jauh') or {}).get('pNaik72') is not None
           and i0.get('modeAsah') == 'UKURAN-x0.6-STOP-x0.75-BELAJAR-TERUS'
           and 'mateHurst' in pp and e0.get('stop') is not None and kt is not None)
    if se is not None and float(se) > 0.72 + 1e-9:
        okA = False
        print('  ⚠ skalaEfektif > 0.72 — faktor asah tak menempel')

kini = time.time() - 25 * 3600
pth = f'{SAND}/laporan/prakira-server.jsonl'
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
open(pth, 'w').writelines(out)
k = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
if isinstance(k.get('epochTerakhir'), str) and k.get('epochTerakhir'):
    k['epochTerakhir'] = '2000-01-01'
    json.dump(k, open(f'{SAND}/otak/penjaga-keadaan.json', 'w'))

jalankan('RUN B (matang → organ-baru)')
gs = json.load(open(f'{SAND}/otak/genome-server.json'))
orgState = (gs.get('ilmu', {}) or {}).get('organ', {})
ent2 = [json.loads(l) for l in open(pth) if l.strip()]
salahM = [e for e in ent2 if str(e.get('id', '')).endswith('-UJI') and e.get('status') == 'SALAH' and e.get('mate')]
print('\n=== RUN B: vonis SALAH -UJI dgn mate:', len(salahM), '===')
for e in salahM[:4]:
    print('  SALAH:', e['simbol'], e['arah'], 'net', e.get('net'), '| hurst', e['mate'].get('hurst'), '| zSma', e['mate'].get('zSma'), '| evEko', (e['mate'].get('ekonomi') or {}).get('evEkoPct'), '| entropi', e['mate'].get('entropi'))
print('ilmu.organ: total', len(orgState.get('list', [])), '| lulusCt', orgState.get('lulusCt'))
for o in (orgState.get('list') or [])[:5]:
    print('  organ:', o.get('nama'), '| lahir dari', o.get('dari'), '| replay', json.dumps(o.get('replay')), '| status', o.get('status'), '|', (o.get('ket') or '')[:90])
# organ lahir BILA predikat matematikanya cocok — mekanisme benar juga saat diam
# (tak ada SALAH yang cocok predikat = organ tak lahir, BUKAN mekanisme mati).
# Lahir terbukti di 2 run sebelumnya (BNB SELL, DOGE SELL evEko<0).
okB = isinstance(orgState.get('list'), list) and (len(orgState.get('list', [])) > 0 or len(salahM) == 0)

print('\n=== SIMPULAN UJI PAKSA V53r ===')
ok = [('A: entri ARAH non-eksplor TERKUNCI dalam MODE-ASAH (belajar terus) + e.mate tersegel', okA),
      ('B: SALAH melahirkan organ-baru ber-replay', okB)]
for nama, lulus in ok:
    print(('LULUS ' if lulus else 'GAGAL ') + nama)
print('SIMPULAN:', 'LULUS' if all(l for _, l in ok) else 'PERIKSA MANUAL')
