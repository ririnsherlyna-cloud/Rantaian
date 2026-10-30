#!/usr/bin/env python3
# KOREKSI-RAPI-1030 — editMessageText 408 (angka detak jujur) + 409 (format rezim).
import json, urllib.request, urllib.parse

BASE = '/home/z/my-project'
token = open(f'{BASE}/.token-telegram').read().strip()

def edit(mid, teks):
    data = urllib.parse.urlencode({'chat_id': '8340502683', 'message_id': mid, 'text': teks}).encode()
    req = urllib.request.Request(f'https://api.telegram.org/bot{token}/editMessageText', data=data)
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=20).read())
        print(f'msg {mid}:', 'OK' if r.get('ok') else str(r)[:120])
    except Exception as e:
        print(f'msg {mid}: GAGAL {e}')

# ---- 408: koreksi angka detak (jujur: 1 tertulis utuh + 3 terbukti dari jejak siklus) ----
lap = open(f'{BASE}/data/daily_reports/2026-10-30.md').read()
baris_a_lama = [l for l in lap.splitlines() if l.startswith('(a)')]
if baris_a_lama:
    baris_a = ('(a) DETAK HIDUP 24 JAM: 4 terkirim sukses — 1 tertulis utuh di worklog (msg 406, siklus 1401) '
               '+ 3 terbukti dari jejak siklus 1387→1389 (msg 396/399/402; tulisannya musnah oleh rollback filesystem '
               'platform — diakui jujur), 0 gagal kirim (send_failures=0). Pengakuan MATI: 1 — gap 3.241,9 menit '
               '(efek rollback ke snapshot 27 Okt, BUKAN kematian sesungguhnya; rantai Actions abadi tetap menyala, '
               'denyut terakhir baru-baru ini).')
    lap_baru = lap.replace(baris_a_lama[0], baris_a)
    open(f'{BASE}/data/daily_reports/2026-10-30.md', 'w').write(lap_baru)
    edit(408, lap_baru.rstrip())
    # sinkronkan hidup.html tetap identik
    html = open(f'{BASE}/download/hidup.html').read()
    if 'LAPORAN_HARIAN_TEKS=`' in html:
        import re
        baru = lap_baru.rstrip().replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${').replace('\n', '\\n')
        html2 = re.sub(r'const LAPORAN_HARIAN_TEKS=`[^`]*`;', f'const LAPORAN_HARIAN_TEKS=`{baru}`;', html, count=1)
        open(f'{BASE}/download/hidup.html', 'w').write(html2)
        print('hidup.html: teks laporan disinkronkan')

# ---- 409: rapikan baris rezim ----
koin = open(f'{BASE}/data/daily_reports/koin-pilihan-1030.md').read()
koin_baru = koin.replace(
    "Rezim BTC: {'rezim': 'TURUN', 'harga': 77124.42, 'atrPct': 1.1} · organ:",
    "Rezim BTC: TURUN @ $77,124.42 (ATR 1.1%) · organ:")
open(f'{BASE}/data/daily_reports/koin-pilihan-1030.md', 'w').write(koin_baru)
edit(409, koin_baru.rstrip())

with open(f'{BASE}/worklog.md', 'a') as f:
    f.write('---\nTask ID: KOREKSI-RAPI-1030\nAgent: respon-cron\nWork Log: editMessageText 408 (koreksi jujur angka detak: 4 sukses = 1 tertulis + 3 terbukti jejak siklus, tulisan 3 msg musnah rollback — diakui) + 409 (format rezim dirapikan); hidup.html disinkronkan agar isi web = isi Telegram selalu identik.\nStage Summary: Kejujuran angka dipulihara; satu sumber kebenaran server otak z.ai dijaga lintas kanal.\n')
print('worklog: KOREKSI-RAPI-1030 tercatat')
