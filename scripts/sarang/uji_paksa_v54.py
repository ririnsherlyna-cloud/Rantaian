#!/usr/bin/env python3
# ============================================================
# UJI PAKSA V54 — buktikan KEMBALI-PINTAR V264 mengikat saat kunci:
#   RUN A: suntik entri SALAH palsu (id -UJI) untuk kandidat ARAH top di
#          salinan sandbox → jalankan → HARUS: koin itu TUNDA (rem, bukan
#          ban) bila keyakinan < bar pelajaran, ATAU terkunci dengan
#          pelajaranLalu tersegel + ukuran/stop menyusut bila lulus.
#   RUN B: rem singkat — suntik kaizen.dingin aktif → HARUS ditolak dengan
#          alasan REM-PINTAR (ber-kadaluarsa), bukan blacklist.
# Semua di salinan /tmp/v264u (produksi tidak disentuh).
# ============================================================
import json
import os
import shutil
import subprocess
import sys

SRC = '/tmp/v264'
SAND = '/tmp/v264u'

shutil.rmtree(SAND, ignore_errors=True)
shutil.copytree(SRC, SAND)

def pilih_arah_kandidat():
    """Kembalikan daftar simbol kandidat ARAH (dari kandidatLain + fallback ledger)"""
    st = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
    sims = [k.get('simbol') for k in (st.get('kandidatLain') or []) if k.get('simbol')]
    if not sims:
        prak = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
        sims = [e['simbol'] for e in prak if e.get('jalur') == 'ARAH'][-3:]
    return list(dict.fromkeys(sims))[:4]

kand = pilih_arah_kandidat()
# sertakan pengunci ARAH hari ini (mereka yang pasti mencapai gerbang kunci)
prak0 = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
for e in prak0:
    if e.get('jalur') == 'ARAH' and (e.get('waktuKunci') or '').startswith('2026-10-03'):
        kand.append(e['simbol'])
kand = list(dict.fromkeys(kand))[:6]
print('RUN A: suntik SALAH (2× per simbol, dua arah) untuk', kand)

# suntik 2 entri SALAH matang per (simbol × arah BUY/SELL) — id -UJI anti-tabrakan
prak = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
fals = []
for sim in kand:
    for arah in ('BUY', 'SELL'):
        for i in range(2):
            fals.append({
                'id': f'UJI-{sim}-{arah}-{i}', 'simbol': sim, 'jalur': 'ARAH', 'arah': arah,
                'keyakinan': 60, 'entry': 1.0, 'waktuKunci': '2026-10-01T00:0%d:00.000Z' % i,
                'horizon': '24j', 'rezim': 'DATAR', 'status': 'SALAH', 'net': -0.05,
                'impas': {'zona': 0.0, 'keyakinanTerkalibrasi': 35},
            })
prak.extend(fals)
with open(f'{SAND}/laporan/prakira-server.jsonl', 'w') as f:
    for e in prak:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

# lemaskan gerbang hulu DI SALINAN (pola uji_paksa_v53) — agar kandidat uji
# mencapai gerbang kembali-pintar (eksplorasi juga dimatikan agar jalur normal yang diuji)
src = open(f'{SAND}/scripts/penjaga.mjs').read()
src = src.replace('ODDS_MIN: 55,', 'ODDS_MIN: 25,')
src = src.replace('AMBANG_TAMBAH_MAKS: 20,', 'AMBANG_TAMBAH_MAKS: 0,')
src = src.replace("const eksplorasiArah = tercemarArah.find((k) => k.eksA && k.eksA.evPct >= 0) || null", "const eksplorasiArah = null")
open(f'{SAND}/scripts/penjaga.mjs', 'w').write(src)
print('gerbang hulu dilemaskan di salinan (ODDS_MIN 25, ambang-tambah 0, eksplor off)')

p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
print(f'--- RUN A: rc={p.returncode}')
out = p.stdout or ''
for baris in out.splitlines():
    if any(k in baris for k in ('kembali-pintar', 'rem-pintar', 'PINTAR', 'impas-')):
        print(' ', baris[:200])
if p.returncode != 0:
    print(p.stderr[-3000:]); sys.exit(1)

# periksa hasil: kunci baru simbol uji (semua arah)
prak2 = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
hasil = []
for e in prak2:
    if e.get('simbol') in kand and e.get('jalur') == 'ARAH' and e.get('waktuKunci', '').startswith('2026-10-03') and not str(e.get('id', '')).startswith('UJI'):
        hasil.append(e)
lulus = [e for e in hasil if 'pelajaranLalu' in e]
print(f'  entri baru kandidat-uji: {len(hasil)} · dengan pelajaranLalu: {len(lulus)}')
if lulus:
    e0 = lulus[0]
    pl = e0['pelajaranLalu']
    print(f"  KEMBALI-PINTAR LULUS: {e0['simbol']} {e0['arah']} bar={pl.get('barKeyakinan')} skala={pl.get('skalaFaktor')} stop={pl.get('stopFaktor')} mengikat={pl.get('mengikatSaat')} sebab={pl.get('sebabTerakhir')}")
else:
    print('  KEMBALI-PINTAR TUNDA (syarat belum terpenuhi) — cek nearMiss/alasan di stdout di atas')
a_lulus = bool(lulus)
a_tunda = ('KEMBALI-PINTAR TUNDA' in out) or ('kembali-pintar' in out and not lulus)
print(f'RUN A: pelajaranLalu={a_lulus} · tunda-terlihat={a_tunda}')

# RUN B: rem singkat — suntik kaizen.dingin aktif untuk semua simbol uji
print(f'\nRUN B: rem singkat aktif untuk {kand}')
keadaan = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
import time as _t
keadaan.setdefault('kaizen', {})['dingin'] = {s: {'beruntun': 0, 'dinginSampai': (_t.time() + 0.2 * 3600) * 1000} for s in kand}
json.dump(keadaan, open(f'{SAND}/otak/penjaga-keadaan.json', 'w'), ensure_ascii=False)

# hapus SALAH suntikan agar syarat tak mendominasi, biarkan rem yang bicara
prak3 = [e for e in prak2 if not str(e.get('id', '')).startswith('UJI-')]
with open(f'{SAND}/laporan/prakira-server.jsonl', 'w') as f:
    for e in prak3:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

p2 = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
out2 = p2.stdout or ''
print(f'--- RUN B: rc={p2.returncode}')
for baris in out2.splitlines():
    if 'rem-pintar' in baris:
        print(' ', baris[:200])
b_ok = 'rem-pintar' in out2
print(f'RUN B: rem-pintar aktif = {b_ok}')

print('\n=== UJI PAKSA V54 ===')
print(f"RUN A (kembali-pintar mengikat): {'LULUS' if (a_lulus or a_tunda) else 'GAGAL'} (lulus-syarat={a_lulus}, tunda={a_tunda})")
print(f"RUN B (rem singkat, bukan blacklist): {'LULUS' if b_ok else 'GAGAL'}")
sys.exit(0 if (a_lulus or a_tunda) and b_ok else 1)
