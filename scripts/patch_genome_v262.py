#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V262-EVO-BUFFER — patch penjaga.mjs server (repo Micaprofita-)

AKAR GENOME BEKU 16 HARI (2026-10-12 → 10-28):
  Evolusi genome mensyaratkan >=3 vonis matang dinilai dalam SATU siklus.
  Sejak pipeline V299+ (organ cepat, kunci drip-feed), 849/941 siklus hanya
  mengunci 1 vonis → vonis matang juga 1/siklus → syarat >=3/siklus tak
  pernah terpenuhi lagi. Klaster >=3 terakhir: 2026-10-12 13:45 UTC (64 vonis
  batch) — itulah generasi 6 terakhir.

PERBAIKAN:
  Vonis matang di-BUFFER persisten (kaizen.evoBuf / evoBufWaw / evoBufPhx di
  otak/penjaga-keadaan.json); evolusi jalan begitu buffer >= 3 sampel nyata,
  lalu buffer dikosongkan. Jaminan jujur tetap: min 3 bukti medan, tanpa
  karangan; uji-balik (delta-revert) tetap mengawal eksperimen bobot.
"""
import json, hashlib, io, sys

SRC = '/home/z/my-project/data/_server/penjaga_server.mjs'
OUT = '/home/z/my-project/data/_server/penjaga_patched.mjs'
MAN_IN = '/home/z/my-project/data/_server/manifes.json'
MAN_OUT = '/home/z/my-project/data/_server/manifes_patched.json'

src = io.open(SRC, encoding='utf-8').read()

def replace_once(text, old, new, tag):
    if text.count(old) != 1:
        print(f'GAGAL: pola {tag} ditemukan {text.count(old)}x (harus 1x)')
        sys.exit(1)
    print(f'OK: {tag}')
    return text.replace(old, new)

# ---- P1: init buffer persisten setelah const kaizen ----
old = """if (!Array.isArray(keadaan.kaizen.netHist)) keadaan.kaizen.netHist = []
const kaizen = keadaan.kaizen
"""
new = """if (!Array.isArray(keadaan.kaizen.netHist)) keadaan.kaizen.netHist = []
const kaizen = keadaan.kaizen
// V262-EVO-BUFFER — AKAR GENOME BEKU 2026-10-12→10-28 (16 hari): kunci jadi
// drip-feed (849/941 siklus hanya 1 vonis) sehingga vonis matang juga 1/siklus;
// syarat lama ">=3 dinilai dalam SATU siklus" tak pernah terpenuhi lagi. Kini
// vonis matang di-buffer persisten antar denyut; evolusi jalan begitu buffer
// >= 3 sampel nyata (jaminan jujur tetap: min 3 bukti medan, nol karangan).
if (!Array.isArray(kaizen.evoBuf)) kaizen.evoBuf = []
if (!Array.isArray(kaizen.evoBufWaw)) kaizen.evoBufWaw = []
if (!Array.isArray(kaizen.evoBufPhx)) kaizen.evoBufPhx = []
"""
src = replace_once(src, old, new, 'P1-init-buffer')

# ---- P2: evolusi ARAH berbasis buffer ----
old = """let evolusiCatatan = 'belum cukup sampel (min 3 dinilai per siklus)'
if (dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX').length >= 3) {
  const kom = dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX')
"""
new = """let evolusiCatatan = `menunggu buffer 3 dinilai — saat ini ${(kaizen.evoBuf.length + dinilaiBaru.filter((e) => e.jalur !== 'PHOENIX').length) % 299}/3`
for (const e of dinilaiBaru) if (e.jalur !== 'PHOENIX') kaizen.evoBuf.push({ bukti: e.bukti, arah: e.arah, status: e.status })
if (kaizen.evoBuf.length > 300) kaizen.evoBuf = kaizen.evoBuf.slice(-300)
if (kaizen.evoBuf.length >= 3) {
  const kom = kaizen.evoBuf.splice(0, kaizen.evoBuf.length)
"""
src = replace_once(src, old, new, 'P2-evolusi-ARAH')

# ---- P3: evolusi WAW berbasis buffer ----
old = """// V253: evolusi genome wawasan — jalan belajar yang sama utk 12 param baru
if (dinilaiBaru.filter((e) => e.buktiWaw).length >= 3) {
  const komW = dinilaiBaru.filter((e) => e.buktiWaw)
"""
new = """// V253: evolusi genome wawasan — jalan belajar yang sama utk 12 param baru
// V262-EVO-BUFFER: akumulasi antar denyut, bukan lagi syarat per-siklus
for (const e of dinilaiBaru) if (e.buktiWaw) kaizen.evoBufWaw.push({ buktiWaw: e.buktiWaw, arah: e.arah, status: e.status })
if (kaizen.evoBufWaw.length > 300) kaizen.evoBufWaw = kaizen.evoBufWaw.slice(-300)
if (kaizen.evoBufWaw.length >= 3) {
  const komW = kaizen.evoBufWaw.splice(0, kaizen.evoBufWaw.length)
"""
src = replace_once(src, old, new, 'P3-evolusi-WAW')

# ---- P4: evolusi PHOENIX berbasis buffer ----
old = """let evolusiPhxCatatan = 'radar: belum cukup sampel (min 3 dinilai per siklus)'
const phxDinilai = dinilaiBaru.filter((e) => e.jalur === 'PHOENIX')
if (phxDinilai.length >= 3) {
"""
new = """let evolusiPhxCatatan = `radar: menunggu buffer 3 — saat ini ${kaizen.evoBufPhx.length % 299}/3`
for (const e of dinilaiBaru) if (e.jalur === 'PHOENIX') kaizen.evoBufPhx.push({ radar: e.radar, status: e.status })
if (kaizen.evoBufPhx.length > 300) kaizen.evoBufPhx = kaizen.evoBufPhx.slice(-300)
const phxDinilai = kaizen.evoBufPhx.length >= 3 ? kaizen.evoBufPhx.splice(0, kaizen.evoBufPhx.length) : []
if (phxDinilai.length >= 3) {
"""
src = replace_once(src, old, new, 'P4-evolusi-PHOENIX')

# ---- P5: observabilitas buffer di laporan denyut ----
old = "pompaTua: pompaTuaCt, pengawasKena: ilmu.pengawas.kena },"
new = "pompaTua: pompaTuaCt, pengawasKena: ilmu.pengawas.kena, evoBuf: kaizen.evoBuf.length, evoBufWaw: kaizen.evoBufWaw.length, evoBufPhx: kaizen.evoBufPhx.length },"
src = replace_once(src, old, new, 'P5-report-observability')

io.open(OUT, 'w', encoding='utf-8').write(src)

# ---- manifest: perbarui entri kode penjaga.mjs ----
man = json.load(io.open(MAN_IN, encoding='utf-8'))
data = src.encode('utf-8')
h16 = hashlib.sha256(data).hexdigest()[:16]
did = False
for k in man.get('kode', []):
    if k.get('file') == 'scripts/penjaga.mjs':
        k['hash'] = h16
        k['size'] = len(data)
        k['cadanganWaktu'] = '2026-10-28T04:30:00.000Z'
        did = True
if not did:
    print('GAGAL: entri kode penjaga.mjs tak ditemukan di manifest'); sys.exit(1)
man['diperbarui'] = '2026-10-28T04:30:00.000Z'
io.open(MAN_OUT, 'w', encoding='utf-8').write(json.dumps(man, indent=1, ensure_ascii=False))
print('hash baru penjaga.mjs:', h16, '| size:', len(data))
print('manifest & cadangan siap disinkronkan')
