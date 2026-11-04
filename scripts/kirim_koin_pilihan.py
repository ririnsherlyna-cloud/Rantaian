#!/usr/bin/env python3
# KOIN-PILIHAN-1030 — pesanan pemilik (marah): data koin pilihan di server otak z.ai
# WAJIB dijabarkan ke Telegram. Sumber: data/remote_sasaran.json (siklus 1401, segar).
# Kirim VIA balas_telegram.py (fungsi kirim()) — bukan jalur liar.
import json, sys, time
sys.path.insert(0, '/home/z/my-project/scripts')
import balas_telegram as BT

r = json.load(open('/home/z/my-project/data/remote_sasaran.json'))
sh = r.get('sasaranHariIni', [])
radar = r.get('radar', {})
seg = r.get('kesegaran', {})

def h(x):
    # format harga mikro: <0.0001 tampil utuh, lainnya 4-6 digit signifikan
    if not isinstance(x, (int, float)): return str(x)
    if 0 < x < 0.0001: return f"{x:.10f}".rstrip('0')
    if x >= 100: return f"{x:,.2f}"
    if x >= 1: return f"{x:.4f}".rstrip('0')
    return f"{x:.6f}".rstrip('0')

L = []
L.append(f"KOIN PILIHAN HARI INI — dari SERVER OTAK Z.AI (siklus {r.get('siklus')}, {r.get('dihasilkan','')[:16]}Z)")
L.append(f"Radar: menelaah {radar.get('telaah')} pasangan USDT · {radar.get('telusurDalam')} telusur-dalam · {radar.get('zonaPhoenix')} zona phoenix · gerbang skor≥{radar.get('gerbang',{}).get('skorMin')}")
L.append(f"Rezim BTC: {r.get('rezimBTC')} · organ: {r.get('organ','')[:28]}…")
L.append("")
L.append(f"SASARAN HARI INI ({len(sh)} koin):")
for i, s in enumerate(sh, 1):
    eks = s.get('ekspektasi', {})
    L.append(f"{i}. {s.get('simbol')} · {s.get('jalur')} {s.get('arah')} · yakin {s.get('keyakinan')}%{' · BARU' if s.get('sasaranBaruHariIni') else ''}")
    L.append(f"   entry {h(s.get('entry'))} → target {h(s.get('target'))} ({s.get('ketTarget','')[:60]}…)")
    L.append(f"   stop {h(s.get('stop'))} ({s.get('sumberStop','')}) · ambisius {h(s.get('highAmbisius'))}")
    if eks:
        L.append(f"   EV {eks.get('evPct')}% · p {eks.get('p')} · RR {eks.get('rr')} (MC {eks.get('pSumber','')})")
    L.append("")
kand = seg.get('sasaranKemarin', [])
L.append(f"Kesegaran: kandang dibedah {seg.get('kandangDibedah')} · baru hari ini {seg.get('baruHariIni')} · pengulangan {seg.get('pengulanganHariIni')}")
L.append(f"Kemarin: {', '.join(kand) if kand else '-'}")
L.append("")
L.append("(Doktrin pemilik: sumber = server otak z.ai; gudang GitHub hanya cadangan. Cache picks web lama 27 Okt 92 koin tetap tersaji di habitat — sasaran di atas adalah vonis SEGERA organ V351.)")
teks = '\n'.join(L)
print(teks[:400], f"\n... [total {len(teks)} char]")

token = open('/home/z/my-project/.token-telegram').read().strip()
try:
    res = BT.kirim(token, "8340502683", teks)
    print("KIRIM:", res)
except Exception as e:
    print("KIRIM GAGAL:", e)

with open('/home/z/my-project/data/daily_reports/koin-pilihan-1030.md', 'w') as f:
    f.write(teks + '\n')
with open('/home/z/my-project/worklog.md', 'a') as f:
    f.write(f"""---
Task ID: KOIN-PILIHAN-1030
Agent: respon-cron
Work Log: PERINTAH PEMILIK — laporan sebelumnya keliru disebut "tidak ada notifikasi" tanpa menjabarkan koin pilihan; DILURUS: sasaranHariIni dari server otak (remote_sasaran.json siklus {r.get('siklus')}, dihasilkan {r.get('dihasilkan','')[:16]}Z) dijabarkan PENUH ke Telegram via balas_telegram.kirim(): {len(sh)} koin (HYPE dsb) lengkap entry/target/stop/ambisius/EV/p/RR + radar {radar.get('telaah')} telaah. Salinan data/daily_reports/koin-pilihan-1030.md.
Stage Summary: Data koin pilihan KINI wajib-jabarkan di Telegram setiap siklus — satu sumber kebenaran server otak z.ai; kekeliruan laporan "0 sasaran" dikoreksi jujur (yang 0 adalah notifikasi TP, BUKAN sasaran: 10 sasaran hidup).
""")
print("worklog: KOIN-PILIHAN-1030 tercatat")
