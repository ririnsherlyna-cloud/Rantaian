#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RESTORE-TUBUH (GEN-11.2, strategi benteng-total): satu perintah memulihkan
SELURUH inti MicroProfita dari benteng Rantaian — dipanggil oleh heartbeat-cron
ATAU penyelamat-cron setiap kunjungan SEBELUM mempercayai disk lokal.
Pelajaran 27 Okt: disk lokal rollback sampai 12x/hari, tiap 30-60 menit.
Benteng = satu-satunya sumber kebenaran; disk lokal = serda kerja.
PELAJARAN ROLLBACK #9/#11/#12 (28 Okt): penanda UMUM ('GEN-', 'powerMax') hidup
di banyak generasi kode -> file lama korban rollback lolos cek dan tak ditimpa.
FIX: penanda wajib SPESIFIK VERSI ('daftar_peluang_profit' = GEN-10,
'daftar-100' = V305) — file lokal yang kehilangan penanda versi = PASTI revert
-> ditimpa otomatis dari benteng.
GEN-11.2 (28 Okt): penanda BOT-CHAT naik ke v8 (rantai abadi Actions) +
restorer kini juga MENGHIDUPKAN KEMBALI penjaga --jaga bila penanda hidupnya
mati > 3 menit (sandbox kadang membunuh daemon antar kunjungan cron)."""
import json, base64, os, time, urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
HEAD = {"Authorization": f"Bearer {open('/home/z/my-project/.token-rantaian').read().strip()}",
        "User-Agent": "microprofita-hb", "Accept": "application/vnd.github+json"}
PETA = [
    ("benteng/heartbeat_local.py", "/home/z/my-project/scripts/heartbeat.py", "daftar_peluang_profit"),
    ("benteng/ip_rotasi.py", "/home/z/my-project/scripts/ip_rotasi.py", "PELINDUNG-IP"),
    ("benteng/web/emas.ts", "/home/z/my-project/src/lib/cyborg/emas.ts", "getEmas"),
    ("benteng/web/arena.ts", "/home/z/my-project/src/lib/cyborg/arena.ts", "daftar-100"),
    ("benteng/web/brain.ts", "/home/z/my-project/src/lib/cyborg/brain.ts", "SLOT_TEMPUR"),
    ("scripts/balas_telegram.py", "/home/z/my-project/scripts/balas_telegram.py", "BENTENG-BALAS v8"),
]

def ambil(path):
    """Via API (bukan raw) agar 404/file baru tidak tertahan cache CDN."""
    req = urllib.request.Request(f"{API}/{path}", headers=HEAD)
    with urllib.request.urlopen(req, timeout=25) as r:
        j = json.loads(r.read().decode())
    return base64.b64decode((j.get("content") or "").replace("\n", ""))

hasil = []
for sumber, tujuan, penanda in PETA:
    try:
        isi = ambil(sumber)
        teks = isi.decode("utf-8", "replace")
        ok = penanda in teks
        try:
            os.makedirs(os.path.dirname(tujuan), exist_ok=True)
            lokal_ada = os.path.exists(tujuan)
            lokal_isi = open(tujuan, "rb").read() if lokal_ada else b""
            lokal_punya_penanda = penanda.encode("utf-8") in lokal_isi
            if not lokal_ada:
                open(tujuan, "wb").write(isi)
                aksi = "DIPULIHKAN (file hilang)"
            elif lokal_isi == isi:
                aksi = "sudah sama"
            elif ok and not lokal_punya_penanda:
                open(tujuan, "wb").write(isi)
                aksi = "DIPULIHKAN (REVERT terdeteksi: lokal tak punya penanda versi)"
            elif lokal_punya_penanda and not ok:
                aksi = "LOKAL LEBIH BARU (punya penanda versi, benteng belum) -> dibiarkan; jalankan tanam_zai_bridge.py untuk sinkron"
            else:
                aksi = "BEDA, kedua sisi punya penanda versi -> dibiarkan (kemungkinan kerja lokal lebih baru); sinkron via tanam"
            if aksi.startswith("DIPULIHKAN") and os.path.basename(tujuan) == "heartbeat.py":
                os.chmod(tujuan, 0o755)
        except Exception as e:
            hasil.append(f"GAGAL tulis {tujuan}: {repr(e)[:80]}")
            continue
        hasil.append(f"{aksi} {tujuan} (penanda '{penanda}': {'OK' if ok else 'HILANG!'})")
    except Exception as e:
        hasil.append(f"GAGAL ambil {sumber}: {repr(e)[:80]}")

# cache picks: hanya bila lokal HILANG atau lebih miskin dari benteng
try:
    isi = ambil("benteng/sasaran-zai.json")
    benteng = json.loads(isi.decode("utf-8"))
    tujuan = "/home/z/my-project/data/zai_picks_last.json"
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    lama = None
    try:
        lama = json.load(open(tujuan))
    except Exception:
        lama = None
    n_benteng = len(benteng.get("picks") or [])
    n_lama = len((lama or {}).get("picks") or [])
    if lama is None or n_benteng > n_lama:
        open(tujuan, "wb").write(isi)
        hasil.append(f"DIPULIHKAN {tujuan} (benteng {n_benteng} picks vs lokal {n_lama})")
    else:
        hasil.append(f"cache picks cukup (lokal {n_lama} >= benteng {n_benteng})")
except Exception as e:
    hasil.append(f"GAGAL sasaran-zai: {repr(e)[:80]}")

print("RESTORE-TUBUH:")
for h in hasil:
    print(" -", h)

# ---- BOT-CHAT v8: jawab pesan Telegram pemilik yang menumpuk (LOKAL SAJA) ----
# Setiap kunjungan cron memanggil restore_tubuh -> bot menjawab dalam detik.
# Mode Actions dilarang di sini (workflow balas tersendiri menangani rantai abadi).
if not os.environ.get("GITHUB_WORKSPACE"):
    try:
        import subprocess
        BOT = "/home/z/my-project/scripts/balas_telegram.py"
        if os.path.exists(BOT):
            r = subprocess.run(["python3", BOT, "--sekali"],
                               capture_output=True, text=True, timeout=110)
            for baris in ((r.stdout or "").splitlines()[-5:]):
                print("BOT-CHAT:", baris)
    except Exception as e:
        print("BOT-CHAT gagal:", repr(e))
    # GEN-11.2: hidupkan kembali penjaga --jaga bila penanda hidupnya mati >3 menit
    try:
        nyala = 0.0
        try:
            nyala = float(open("/home/z/my-project/data/penjaga_nyala").read().strip())
        except Exception:
            pass
        if time.time() - nyala > 180:
            log = open("/home/z/my-project/data/bot_chat.log", "ab")
            subprocess.Popen(["setsid", "python3", BOT, "--jaga"],
                             stdout=log, stderr=subprocess.STDOUT,
                             start_new_session=True)
            print("BOT-CHAT: penjaga --jaga dihidupkan kembali (setsid)")
        else:
            print("BOT-CHAT: penjaga --jaga masih hidup — dibiarkan")
    except Exception as e:
        print("BOT-CHAT jaga gagal:", repr(e))
