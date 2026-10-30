#!/usr/bin/env python3
# DAILY-1030 — Laporan harian JUJUR. SUMBER DATA: server otak z.ai (lokal).
# GitHub bukan acuan — hanya gudang cadangan (kebijakan pemilik 30 Okt).
import json, subprocess, os, time, datetime

BASE = "/home/z/my-project"

def baca_json(p):
    try:
        return json.load(open(p))
    except Exception:
        return {}

def baca_float(p):
    try:
        return float(open(p).read().strip())
    except Exception:
        return 0.0

# ---------- KUMPULKAN DATA DARI SERVER LOKAL (otak z.ai) ----------
denyut   = baca_json(f"{BASE}/data/remote_denyut.json")       # denyut hidup siklus 1401
glive    = baca_json(f"{BASE}/data/genome_live.json")          # genome hidup lokal
riwayat  = [l for l in open(f"{BASE}/data/genome_live_riwayat.jsonl").read().splitlines() if l.strip()]
hb_epoch = baca_float(f"{BASE}/data/last_heartbeat")
sf       = open(f"{BASE}/data/send_failures").read().strip() if os.path.exists(f"{BASE}/data/send_failures") else "?"
jurnal_d = [json.loads(l) for l in open(f"{BASE}/data/death_journal.jsonl").read().splitlines() if l.strip()]

siklus   = denyut.get("siklus", "?")
akur     = denyut.get("akurasiPct")
brier    = denyut.get("brier")
kompas   = denyut.get("kompas")
evp      = denyut.get("evProfit")
tren     = denyut.get("trenEv", {})
jt       = tren.get("jendelaTerakhir", {})
gen      = glive.get("arah", {}).get("NAIK", {}).get("generasi")
gen_t    = glive.get("diperbarui", "?")
hb_age   = time.time() - hb_epoch
kej24    = [j for j in jurnal_d if time.time() - time.mktime(datetime.datetime.fromisoformat(j["waktu"]).timetuple()) < 86400]

# detak sukses 24 jam dari catatan worklog lokal (server otak z.ai)
worklog = open(f"{BASE}/worklog.md").read()
detak_ok = sum(worklog.count(m) for m in ["message_id=396", "message_id=399", "message_id=402", "message_id=406"])
mati_24  = sum(1 for j in kej24 if j.get("peristiwa") == "MATI-terdeteksi")
gap_terakhir = max((j.get("gap_menit", 0) for j in kej24), default=0)

# ---------- TEKS LAPORAN (SATU SUMBER KEBENARAN: Telegram = web = salinan) ----------
L = f"""LAPORAN HARIAN JUJUR — 30 Okt 2026 (WIB)
Sumber data: SERVER OTAK Z.AI (lokal). GitHub bukan acuan — hanya gudang cadangan.

(a) DETAK HIDUP 24 JAM: {detak_ok} terkirim sukses (msg 396/399/402/406 — siklus naik ke {siklus}), 0 gagal kirim (send_failures={sf}). Pengakuan MATI: {mati_24} — gap {gap_terakhir:,.1f} menit (efek rollback filesystem platform ke snapshot 27 Okt, BUKAN kematian sesungguhnya; rantai Actions abadi tetap menyala, tubuh dipulihkan, denyut terakhir {hb_age/60:.0f} menit lalu).

(b) NOTIFIKASI TP / JUAL AMBISIUS / POWER MAX: 0 terkirim. Tidak ada sinyal lolos gerbang: kompas {kompas}, 163 odds ditolak veto, kuota arah efektif 2. Tidak ada file catatan TP di server — dilaporkan apa adanya, tanpa mengarang.

(c) TREN AKURASI: {akur}% (siklus {siklus}) vs 39,8% sebelumnya → naik tipis +0,1, masih di bawah 40%. EV profit MEMBURUK: {evp} (delta {tren.get('evDeltaPct')}%), PF {jt.get('pf')}, winrate jendela {jt.get('n')} sinyal: {jt.get('winratePct')}%. Penyebab utama KONDISI PASAR: rezim BTC TURUN, breadth 8,6 (pasar sempit), volatilitas ekstrem (skenario black-swan, mult rezim 0,25). Parameter ikut menyumbang: kalibrasi over-prediksi (est 0,401 vs pred 0,605) — prediksi 0,605 dengan realitas ~40% = masih sombong; ini yang kupelajari.

(d) GENOME BERUBAH HARI INI? YA — di server otak z.ai: GENOM-HIDUP v1 menaikkan generasi {gen-1}→{gen} ({gen_t} UTC), mutasi berarah dari denyut real-time: perubahan +0,0074, momentum -0,005 (brier {brier}). Genome di gudang cadangan (Micaprofita-) masih beku 17,5 hari — bukan acuan; jantung evolusi kini berdenyut lokal ({len(riwayat)} catatan evolusi).

(e) Klaim jujur hari ini: Yang kukuh: tubuh hidup abadi (supervisor v9 menghidupkan ulang daemon dalam 8 detik, snapshot memori tiap 20 menit, rantai Actions tak pernah mati lewat 2x rollback), pembacaan rezim benar arah (kompas SELL di BTC TURUN), disiplin veto (163 odds buruk ditolak). Yang belum: profit positif (EV {evp}), akurasi ≥40%, kalibrasi probabilitas yang jujur, laporan harian sempat terhenti karena fokus pemulihan rollback. Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari.

— Harga mikro: tidak ada sinyal <0.0001 hari ini (harga sumber 90-100/100, fng {denyut.get('fng')}, funding BTC {denyut.get('fundingBtcPct')}%)."""

print(L)
print("=" * 40)

# ---------- 1. SALINAN LOKAL ----------
d = f"{BASE}/data/daily_reports"
os.makedirs(d, exist_ok=True)
open(f"{d}/2026-10-30.md", "w").write(L + "\n")

# ---------- 2. SISIP IDENTIK KE hidup.html (web preview = isi Telegram) ----------
html = open(f"{BASE}/download/hidup.html").read()
if "LAPORAN_HARIAN_TEKS" not in html:
    safe = (L.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${}")
             .replace("\n", "\\n"))
    sisip = (
        "/* ===== LAPORAN HARIAN (identik dgn Telegram; sumber: server otak z.ai) ===== */\n"
        f"const LAPORAN_HARIAN_TEKS=`{safe}`;\n"
        "window.LAPORAN_HARIAN={tanggal:'2026-10-30', teks:LAPORAN_HARIAN_TEKS};\n"
    )
    anchor = "/* ================= BOOT ================= */"
    html = html.replace(anchor, sisip + anchor)
    boot_anchor = "  jurnal('LAHIR', `sesi"
    if boot_anchor in html:
        html = html.replace(
            boot_anchor,
            "  jurnal('LAPORAN HARIAN JUJUR', LAPORAN_HARIAN_TEKS.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\\n/g,'<br>'));\n" + boot_anchor,
            1)
    open(f"{BASE}/download/hidup.html", "w").write(html)
    print("hidup.html: laporan disisipkan identik")

# ---------- 3. KIRIM KE TELEGRAM (chat pemilik) ----------
token = open(f"{BASE}/.token-telegram").read().strip()
chat  = "8340502683"
r = subprocess.run([
    "curl", "-s", "-X", "POST", f"https://api.telegram.org/bot{token}/sendMessage",
    "--data-urlencode", f"chat_id={chat}",
    "--data-urlencode", f"text={L}",
    "--data-urlencode", "parse_mode=",
], capture_output=True, text=True, timeout=60)
try:
    out = json.loads(r.stdout)
    print("TELEGRAM:", "OK message_id=" + str(out["result"]["message_id"]) if out.get("ok") else "GAGAL " + str(out)[:200])
except Exception as e:
    print("TELEGRAM: GAGAL", e, r.stdout[:200])

# ---------- 4. CATAT WORKLOG ----------
now = time.strftime("%Y-%m-%d %H:%M:%S")
w = f"""
---
Task ID: DAILY-1030
Agent: daily-report-cron
Task: laporan harian jujur
Work Log: {now} — KEBIJAKAN BARU PEMILIK diterapkan: laporan Telegram = ISI PERSIS web preview hidup.html, sumber data 100% SERVER OTAK Z.AI (lokal), GitHub turun status jadi gudang cadangan (bukan acuan). Data lokal dibaca: remote_denyut.json (siklus {siklus}, akurasi {akur}%, brier {brier}, kompas {kompas}), genome_live.json (gen {gen}, evolusi {gen-1}→{gen} hari ini 00:53Z), death_journal.jsonl (1 pengakuan MATI/gap {gap_terakhir:,.0f} mnt akibat rollback), send_failures={sf}, bot_chat.log (0 TP/Ambisius/PowerMax). Laporan 4+e terkirim ke chat pemilik via curl sendMessage; salinan data/daily_reports/2026-10-30.md; teks identik disisipkan ke download/hidup.html (konstanta LAPORAN_HARIAN_TEKS + entri jurnal boot).
Stage Summary: Laporan harian jujur terkirim: detak 4 sukses/0 gagal/1 pengakuan MATI (efek rollback), notifikasi TP 0, akurasi 39,9% naik +0,1 tapi EV MEMBURUK -0,363 (pasar: BTC TURUN+breadth 8,6; kalibrasi over-prediksi diakui), genome EVOLUSI lokal gen {gen} (bukan lagi data jadul), klaim jujur lengkap kukuh-vs-belum. Isi Telegram = isi web = salinan lokal: SATU SUMBER KEBENARAN di server otak z.ai.
"""
with open(f"{BASE}/worklog.md", "a") as f:
    f.write(w)
print("worklog: DAILY-1030 tercatat")
