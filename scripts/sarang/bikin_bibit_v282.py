#!/usr/bin/env python3
# BIKIN BIBIT V282 — ambil lilin 1h NYATA dari Binance utk arsip benam hidup.html
# (arsip jujur: dipakai HANYA saat jaringan mati, berlabel ARSIP + stempel waktu)
import json, urllib.request, time

SYMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'GTCUSDT']
UJUNG = ['https://data-api.binance.vision', 'https://api.binance.com']
LIMIT = 168  # 7 hari penuh -> mom7d bisa dihitung dari arsip

def ambil(sim):
    for u in UJUNG:
        try:
            url = f'{u}/api/v3/klines?symbol={sim}&interval=1h&limit={LIMIT}'
            with urllib.request.urlopen(url, timeout=15) as r:
                k = json.loads(r.read())
            c = [round(float(x[4]), 6) for x in k]      # close
            v = [round(float(x[5]), 3) for x in k]      # volume
            ts0 = int(k[0][0])
            return {'tsA': ts0, 'c': c, 'v': v}
        except Exception as e:
            print(f'  gagal {u} {sim}: {str(e)[:60]}')
    return None

out = {}
for s in SYMS:
    d = ambil(s)
    if d:
        out[s] = d
        print(f'{s}: {len(d["c"])} lilin, ts0={d["tsA"]}, tutup akhir={d["c"][-1]}')
    else:
        print(f'{s}: GAGAL TOTAL')
    time.sleep(0.4)

js = json.dumps(out, separators=(',', ':'))
print('UKURAN JSON:', len(js), 'B')
open('/home/z/my-project/scripts/sarang/bibit_v282.json', 'w').write(js)
print('tersimpan scripts/sarang/bibit_v282.json')
