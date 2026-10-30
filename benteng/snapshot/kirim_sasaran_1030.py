#!/usr/bin/env python3
# SASARAN-1030 — Kirim DATA KOIN PILIHAN (sasaran harian) ke Telegram.
# SUMBER: data/remote_sasaran.json di SERVER OTAK Z.AI (lokal, siklus 1401, 00:35Z hari ini).
# GitHub bukan acuan — hanya gudang cadangan.
import json, subprocess, os, time

BASE = "/home/z/my-project"
r = json.load(open(f"{BASE}/data/remote_sasaran.json"))
ss = r["sasaranHariIni"]
kg = r["kesegaran"]
eks_r = r.get("ekspektasiRingkas") or {}

def fmt(v):
    if isinstance(v, (int, float)):
        if 0 < v < 0.0001:
            s = f"{v:.10f}".rstrip('0')
            return s
        return f"{v:,g}" if abs(v) >= 1000 else f"{v:.4f}".rstrip('0').rstrip('.')
    return str(v)

def pct(a, b):
    try: return f"{(b-a)/a*100:+.1f}%"
    except Exception: return "-"

L = []
L.append("KOIN PILIHAN — SASARAN HARI INI (30 Okt 2026)")
L.append(f"Sumber: SERVER OTAK Z.AI (siklus {r.get('siklus')} · {r.get('dihasilkan','')[:16]}Z) — bukan GitHub")
L.append(f"Organ: {r.get('organ','').split('—')[0].strip()} · Rejim BTC: {r.get('rezimBTC')} · Telaah {kg.get('telaahRadar','-')} kandang → {len(ss)} sasaran")
L.append("")
aral = [s for s in ss if s.get('jalur') == 'ARAH']
kolam = [s for s in ss if s.get('jalur') != 'ARAH']
for i, s in enumerate(aral, 1):
    tanda = "BARU" if s.get("sasaranBaruHariIni") else ("BERTAHAN" if s.get("sasaranBertahan") else "PUTAR")
    e = s.get("entry"); t = s.get("target"); st = s.get("stop"); am = s.get("highAmbisius")
    eks = s.get("ekspektasi", {})
    ev = eks.get("evPct"); rr = eks.get("rr")
    L.append(f"{i}. {s['simbol']} · {s.get('arah','-')} · keyakinan {s.get('keyakinan','-')}% · {tanda}")
    L.append(f"   Entry {fmt(e)} → Target {fmt(t)} ({pct(e,t)}) · Stop {fmt(st)} ({pct(e,st)})")
    if am: L.append(f"   Jual Ambisius {fmt(am)} ({pct(e,am)})" + (f" · EV {fmt(ev)}% · RR {fmt(rr)}" if ev is not None else ""))
    nar = (s.get("narasi") or "").strip()
    if nar: L.append(f"   Alasan: {nar[:240]}")
    L.append("")
if kolam:
    L.append(f"KANDANG PENGAMATAN ({len(kolam)}) — dipantau, BELUM rencana deal (arah + entry acuan saja):")
    L.append(" · ".join(f"{s['simbol']} {s.get('arah','-')} {fmt(s.get('entry'))}" for s in kolam))
    L.append("")
L.append(f"Rencana deal lengkap: {', '.join(s['simbol'] for s in aral) or '-'} · Bertahan kemarin: {', '.join(kg.get('sasaranBertahan',[])) or '-'} · Baru hari ini: {kg.get('baruHariIni','-')}")
L.append(f"Sasaran kemarin: {', '.join(kg.get('sasaranKemarin',[]))}")
L.append("Jujur: EV = ekspektasi MC 2.000 lintasan (estimasi kasar, bukan janji). Harga mikro (<0.0001) ditampilkan utuh.")
Laporan = "\n".join(L)
print(Laporan)

open(f"{BASE}/download/otak_sasaran.md", "w").write(Laporan + "\n")
os.makedirs(f"{BASE}/data/daily_reports", exist_ok=True)
open(f"{BASE}/data/daily_reports/2026-10-30-sasaran.md", "w").write(Laporan + "\n")

token = open(f"{BASE}/.token-telegram").read().strip()
aksi = os.environ.get("AKSI", "kirim")
api = ("editMessageText", ["--data-urlencode", "message_id=" + os.environ.get("MID", "")]) if aksi == "edit" else ("sendMessage", [])
r2 = subprocess.run([
    "curl", "-s", "-X", "POST", f"https://api.telegram.org/bot{token}/{api[0]}",
    "--data-urlencode", "chat_id=8340502683",
    *api[1],
    "--data-urlencode", f"text={Laporan}",
], capture_output=True, text=True, timeout=60)
try:
    out = json.loads(r2.stdout)
    print("TELEGRAM:", "OK message_id=" + str(out["result"]["message_id"]) if out.get("ok") else "GAGAL " + str(out)[:150])
except Exception as e:
    print("TELEGRAM GAGAL:", e, r2.stdout[:150])
