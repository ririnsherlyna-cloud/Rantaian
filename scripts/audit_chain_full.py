#!/usr/bin/env python3
# audit_chain_full.py — kesehatan ketiga workflow benteng + timeline spiral primer
import json, subprocess, datetime, time

BASE = '/home/z/my-project'
tok = open(f'{BASE}/.token-rantaian').read().strip()
REPO = 'ririnsherlyna-cloud/Rantaian'
WFS = [('PRIMER benteng-balas', 397866762), ('CADANGAN benteng-balas-2', 399254324), ('DETAK benteng-telegram', 387298982)]

def get(url):
    return subprocess.run(['curl', '-s', '-H', f'Authorization: Bearer {tok}', url],
                          capture_output=True, text=True, timeout=60).stdout

now = time.time()
for nama, wid in WFS:
    d = json.loads(get(f'https://api.github.com/repos/{REPO}/actions/workflows/{wid}/runs?per_page=15'))
    rs = d.get('workflow_runs', [])
    print(f"== {nama} total={d.get('total_count')} ==")
    for r in rs[:15]:
        age = int(now - datetime.datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp())
        print(f"  {age:>7}s event={r['event']:<17} status={r['status']:<11} concl={r['conclusion']} id={r['id']}")

# Timeline primer 40 run terakhir: kapan sukses terakhir, dan celah gelap
d = json.loads(get(f'https://api.github.com/repos/{REPO}/actions/workflows/397866762/runs?per_page=40'))
rs = d.get('workflow_runs', [])
ts = sorted((datetime.datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp(), r) for r in rs)
print("== TIMELINE PRIMER (40 terakhir, tua->muda) ==")
prev = None
for t, r in ts:
    age = int(now - t)
    gap = f"+{int(t-prev)}s" if prev else "   -  "
    prev = t
    print(f"  {age:>7}s {gap:<8} event={r['event']:<17} status={r['status']:<11} concl={r['conclusion']}")
