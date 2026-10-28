"""CEK PRIMER — benteng-balas-2 (wadah kedua) memakai ini untuk memutuskan
mode STANDBY atau GANTIAN.

Logika: bila run terakhir workflow primer benteng-balas.yml dimulai
kurang dari 11 menit lalu, primer dianggap HIDUP -> wadah kedua cukup
standby (mewarisi dirinya sendiri). Bila lebih tua / gagal query ->
primer dianggap MATI -> wadah kedua membangunkan primer DAN mengambil
giliran menjawab pesan.

Output: menulis PRIMER_HIDUP=true/false ke GITHUB_ENV untuk step berikutnya.
"""
import json
import os
import urllib.request
import datetime

REPO = 'ririnsherlyna-cloud/Rantaian'
TOK = os.environ.get('GH_TOKEN', '')
H = {'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json'}
U = f'https://api.github.com/repos/{REPO}/actions/workflows/benteng-balas.yml/runs?per_page=3'

try:
    d = json.load(urllib.request.urlopen(urllib.request.Request(U, headers=H), timeout=30))
    now = datetime.datetime.now(datetime.timezone.utc)
    alive = False
    for r in d.get('workflow_runs', []):
        t = datetime.datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
        if (now - t).total_seconds() < 660:
            alive = True
            break
except Exception as e:
    print('QUERY_GAGAL:', repr(e))
    alive = False  # gagal query = anggap primer mati (aman: lebih baik dobel-jaga 409 sopan daripada sunyi)

print('PRIMER:', 'HIDUP' if alive else 'MATI')
with open(os.environ.get('GITHUB_ENV', '/tmp/cek_primer.env'), 'a') as f:
    f.write(f'PRIMER_HIDUP={"true" if alive else "false"}\n')
