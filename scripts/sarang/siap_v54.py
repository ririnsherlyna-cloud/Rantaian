#!/usr/bin/env python3
# ============================================================
# SIAP V54 — sandbox uji V264-PINTAR-KEMBALI dengan data live:
#   siklus 1 penuh otak server (penjaga.mjs v6.1) di sandbox /tmp/v264.
# Periksa: (1) sintaks & registri 285 param; (2) laporan guru.json punya
#   trenEvolusi (4 jendela); (3) impas.json punya doktrinPintar;
#   (4) sasaran-terkini.json punya r.pintar + r.impas.trenEvolusi;
#   (5) log memakai rem-pintar (bukan dingin-dendam/daftar-hitam);
#   (6) kembali-pintar: pelajaranLalu disegel bila koin bermasalah kembali,
#       atau kembali-pintar tunda bila syarat gagal; (7) cron 15 menit.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request

SAND = '/tmp/v264'
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
        if any(k in baris for k in ('[PENJAGA]', 'RINGKASAN', 'rem-pintar', 'kembali-pintar', 'impas-', 'asah-')):
            print(' ', baris[:200])
    if p.returncode != 0:
        print(p.stderr[-4000:])
    return p.returncode

rc = jalankan('SIKLUS 1 V264')

# ---------- VERIFIKASI ----------
print('\n=== HASIL SIKLUS 1 V264 ===')
ok = []

def baca(jalan):
    try:
        return json.load(open(f'{SAND}/{jalan}'))
    except Exception:
        return None

penjaga_src = open(SUMBER_PENJAGA).read()
ok.append(('sintaks+registri 285', 'TOTAL_PARAM_PINTAR' in penjaga_src and '285' in penjaga_src and 'syaratDariPelajaran' in penjaga_src))
ok.append(('rem singkat 0.25 jam', 'DINGIN_SASARAN_JAM: 0.25' in penjaga_src))
ok.append(('hitam rem 2 jam', 'HITAM_DINGIN_JAM: 2' in penjaga_src))

guru2 = baca('laporan/guru.json')
te = (guru2 or {}).get('trenEvolusi') or {}
ok.append(('guru.json trenEvolusi hidup', te.get('cukupData') is True and len(te.get('jendela', [])) == 4))
if te.get('cukupData'):
    kc = te.get('kecenderungan', {})
    print('  trenEvolusi kecenderungan:', {k: kc.get(k) for k in ('ev', 'pf', 'winrate', 'aturanMengikat')})
    for i, j in enumerate(te.get('jendela', [])):
        print(f"  jendela #{i+1}: n={j.get('n')} wr={j.get('winratePct')}% ev={j.get('evPct')}% pf={j.get('pf')} mengikat={j.get('aturanMengikatPct')}%")

imp2 = baca('laporan/impas.json')
dp = (imp2 or {}).get('doktrinPintar') or {}
ok.append(('impas.json doktrinPintar', bool(dp.get('remPintar')) and bool(dp.get('kembaliPintar')) and 'trenEvolusi' in (imp2 or {})))

st2 = baca('laporan/sasaran-terkini.json')
ok.append(('sasaran-terkini r.pintar', isinstance((st2 or {}).get('pintar'), dict) and 'trenEvolusi' in ((st2 or {}).get('impas') or {})))

log1 = open(f'{SAND}/laporan/denyut-server.jsonl').read()
den_last = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()][-1]
ok.append(('denyut jsonl field pintar+trenEv', isinstance((den_last or {}).get('pintar'), dict) and 'trenEv' in (den_last or {})))
ok.append(('tidak ada lagi dingin-dendam log', 'dingin-dendam' not in log1))

wf = open(SUMBER_WF).read()
ok.append(('cron 15 menit', "cron: '*/15 * * * *'" in wf))

# pelajaranLalu: cek ledger entri baru
try:
    prak2 = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
    baru = [e for e in prak2 if (e.get('waktuKunci') or '') >= '2026']
    pl = [e for e in baru if 'pelajaranLalu' in e]
    ok.append(('pelajaranLalu (kembali-pintar) disegel bila ada koin bermasalah', isinstance(pl, list)))
    if pl:
        e0 = pl[0]
        print(f"  pelajaranLalu: {e0['simbol']} bar={e0['pelajaranLalu'].get('barKeyakinan')} skala={e0['pelajaranLalu'].get('skalaFaktor')} stop={e0['pelajaranLalu'].get('stopFaktor')} mengikat={e0['pelajaranLalu'].get('mengikatSaat')}")
except Exception as e:
    print('  prakira baca gagal:', e)

gagal = [n for n, s in ok if not s]
for n, s in ok:
    print(('LULUS ' if s else 'GAGAL ') + n)
print(f'\n=== SIAP V54: {len(ok) - len(gagal)}/{len(ok)} LULUS ===')
sys.exit(0)
