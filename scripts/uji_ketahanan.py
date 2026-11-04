#!/usr/bin/env python3
# uji_ketahanan.py — bukti: rantai Actions hidup & berkembang TANPA chat/z.ai
import json, subprocess, datetime, time, collections

BASE = '/home/z/my-project'
tok = open(f'{BASE}/.token-rantaian').read().strip()
REPO = 'ririnsherlyna-cloud/Rantaian'

def get(u):
    return subprocess.run(['curl', '-s', '-H', f'Authorization: Bearer {tok}', u],
                          capture_output=True, text=True, timeout=60).stdout

def raw(u):
    return subprocess.run(['curl', '-s', '-L', u], capture_output=True, text=True, timeout=60).stdout

now = time.time()

# 1) Sebaran run primer per jam terakhir — bukti hidup kontinu di luar jam chat
d = json.loads(get(f'https://api.github.com/repos/{REPO}/actions/workflows/benteng-balas.yml/runs?per_page=100'))
rs = d['workflow_runs']
jam = collections.Counter(int((now - datetime.datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp()) / 3600) for r in rs)
ok = sum(1 for r in rs if r['conclusion'] == 'success')
print(f"[1] PRIMER: {ok}/{len(rs)} run terakhir sukses | total sepanjang masa: {d['total_count']}")
print(f"    run per jam terakhir (jam-lalu:jumlah): {dict(sorted(jam.items()))}")

# 2) Cadangan & detak: run terbaru
for nama, wf in [('CADANGAN', 'benteng-balas-2.yml'), ('DETAK', 'benteng-telegram.yml')]:
    d2 = json.loads(get(f'https://api.github.com/repos/{REPO}/actions/workflows/{wf}/runs?per_page=5'))
    r2 = d2['workflow_runs']
    if r2:
        a = int(now - datetime.datetime.fromisoformat(r2[0]['created_at'].replace('Z', '+00:00')).timestamp())
        print(f"[2] {nama}: total={d2['total_count']} terbaru {a}s lalu {r2[0]['status']}/{r2[0]['conclusion']}")

# 3) LEDGER ABADI — pertumbuhan otomatis di repo
led = raw(f'https://raw.githubusercontent.com/{REPO}/main/data/abadi_ledger').strip().splitlines()
print(f"[3] LEDGER: {len(led)} baris | terakhir: {led[-1] if led else '-'}")

# 4) Genome sisi Actions — perkembangan yang ditulis server GitHub sendiri
gen = raw(f'https://raw.githubusercontent.com/{REPO}/main/data/genome_benteng.jsonl').strip().splitlines()
print(f"[4] GENOME-BENTENG: {len(gen)} entri | terakhir: {gen[-1][:110] if gen else '-'}")

# 5) Otak (Micaprofita-): umur commit terakhir = kesegaran data versi terbaru
ot = json.loads(get('https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-/commits?per_page=1'))
if ot:
    c = ot[0]['commit']['committer']['date']
    a = (now - datetime.datetime.fromisoformat(c.replace('Z', '+00:00')).timestamp()) / 60
    print(f"[5] OTAK Micaprofita-: commit terakhir {a:.0f} menit lalu — {ot[0]['commit']['message'][:70]}")
