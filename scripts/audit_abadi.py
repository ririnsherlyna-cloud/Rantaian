#!/usr/bin/env python3
# audit_abadi.py — bedah bukti "lapis abadi terhenti" vs uptime rantai Actions sebenarnya
import json, subprocess, datetime, time, statistics, re

BASE = '/home/z/my-project'

# --- 1) Worklog: hitung kasus hidupkan-jaga & sebaran gap
try:
    txt = open(f'{BASE}/worklog.md', encoding='utf-8', errors='replace').read()
except FileNotFoundError:
    txt = ''
hj = txt.count('hidupkan-jaga')
gaps = [int(g) for g in re.findall(r'gap (\d+)s', txt)]
mati = len(re.findall(r'MATI selama \d+ menit', txt))
if gaps:
    print(f"WORKLOG hidupkan-jaga={hj} | gap n={len(gaps)} min={min(gaps)}s median={int(statistics.median(gaps))}s max={max(gaps)}s | pengakuan MATI={mati}")
else:
    print(f"WORKLOG hidupkan-jaga={hj} | gap tidak terpola | pengakuan MATI={mati}")

# --- 2) Rantai Actions: konklusi & interval 60 run terakhir
tok = open(f'{BASE}/.token-rantaian').read().strip()
url = 'https://api.github.com/repos/ririnsherlyna-cloud/Rantaian/actions/workflows/397866762/runs?per_page=60'
raw = subprocess.run(['curl', '-s', '-H', f'Authorization: Bearer {tok}', url],
                     capture_output=True, text=True, timeout=60).stdout
d = json.loads(raw)
rs = d.get('workflow_runs', [])
now = time.time()
ages = sorted((now - datetime.datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp() for r in rs), reverse=True)
concl = {}
for r in rs:
    c = r['conclusion'] or 'jalan'
    concl[c] = concl.get(c, 0) + 1
print(f"ACTIONS total={d.get('total_count')} | 60 terakhir: {concl}")
print(f"ACTIONS run_terbaru age={int(ages[0])}s status={rs[0]['status']}")
if len(ages) > 1:
    iv = [int(ages[i] - ages[i + 1]) for i in range(len(ages) - 1)]
    iv_sorted = sorted(iv)
    print(f"ACTIONS interval antar-run n={len(iv)} median={int(statistics.median(iv))}s p95={iv_sorted[int(len(iv_sorted)*0.95)]}s MAX={max(iv)}s (gelap terlama rantai)")
