#!/usr/bin/env python3
"""Kirim ulang LAPORAN ATH v10.7 hari ini (perintah pemilik 2 Nov: laporan
lama 02:13 WIB diukur dari ATH masa lampau -> dibuka dedup harian, paksa
kirim dengan PUNCAK KEJADIAN MASA KINI). State harian dibackup dulu; bila
kirim gagal, state dipulihkan."""
import sys, os, shutil, time

F_STATE = "/home/z/my-project/data/ath_harian_state.json"
BAK = F_STATE + ".bak-v107"

sys.path.insert(0, "/home/z/my-project/scripts")
import balas_telegram as bt

if os.path.exists(F_STATE):
    shutil.copy2(F_STATE, BAK)
    os.remove(F_STATE)
    print("state harian dibackup ->", os.path.basename(BAK))

token, chat_id = bt.nyawa()
t0 = time.time()
hasil = bt.ath_cepat(token, paksa=True)
print(f"hasil ({time.time() - t0:.0f}s): {hasil}")

if not str(hasil).startswith("TERKIRIM"):
    if os.path.exists(BAK):
        shutil.copy2(BAK, F_STATE)
        print("kirim GAGAL -> state dipulihkan")
    sys.exit(1)
print("OK: laporan v10.7 terkirim")
