#!/usr/bin/env python3
"""Ambil arena.html versi PRA-V270 (66.942 B) dari commit parent d983fb1 → /tmp/arena_live.html"""
import base64, json, os, sys, urllib.request

REPO = 'ririnsherlyna-cloud/Micaprofita-'
TOK = os.environ.get('GH_TOKEN')
if not TOK: print('GH_TOKEN kosong'); sys.exit(1)

def api(jalan):
    req = urllib.request.Request(f'https://api.github.com/repos/{REPO}/{jalan}', headers={
        'Authorization': f'Bearer {TOK}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'basis-ambil'})
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

komits = api('commits?path=arena.html&per_page=10')
print('riwayat komit arena.html:')
for c in komits[:6]:
    print(' ', c['sha'][:7], c['commit']['committer']['date'], c['commit']['message'].split('\n')[0][:70])
# komit V270 = d983fb1...; parent-nya = versi pra-V270
v270 = next((c for c in komits if c['sha'].startswith('d983fb1')), komits[0])
parent = v270['parents'][0]['sha']
print('parent pra-V270:', parent[:7])
d = api(f'contents/arena.html?ref={parent}')
isi = base64.b64decode(d['content'])
open('/tmp/arena_live.html', 'wb').write(isi)
print('BASIS PRA-V270 TERSIMPAN:', len(isi), 'B | MICABRAIN ada?', b'MICABRAIN' in isi)
