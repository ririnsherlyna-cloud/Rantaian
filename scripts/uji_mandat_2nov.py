#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UJI MANDAT 2 NOV — dry-run mesin ATH (tanpa kirim Telegram) + uji filter label.
Pemanggilan: python3 scripts/uji_mandat_2nov.py [dry|filter]"""
import sys

sys.path.insert(0, "/home/z/my-project/scripts")


def uji_filter():
    """Replika persis filter _izin_level_2nov heartbeat — pastikan hanya
    BUY x JUAL AMBISIUS dan SELL x STOP yang lolos."""
    def izin(arah):
        a = str(arah or "?").upper()
        if a == "BUY":
            return ("JUAL AMBISIUS",)
        if a == "SELL":
            return ("STOP",)
        return ()

    kasus = [
        ("BTCUSDT", "BUY", "JUAL AMBISIUS", True),
        ("BTCUSDT", "BUY", "TP SASARAN", False),
        ("BTCUSDT", "BUY", "POWER MAX AMBISIUS", False),
        ("ETHUSDT", "SELL", "STOP", True),
        ("ETHUSDT", "SELL", "STOP (batal)", True),
        ("ETHUSDT", "SELL", "JUAL AMBISIUS", False),
        ("XAUUSDT", "BUY", "TP SASARAN", False),
        ("XAUUSDT", "SELL", "STOP", True),
        ("ADAUSDT", "?", "JUAL AMBISIUS", False),
    ]
    salah = 0
    for sim, arah, nama, harap in kasus:
        dapat = any(str(nama) == p or str(nama).startswith(p) for p in izin(arah))
        tanda = "OK" if dapat == harap else "SALAH"
        if dapat != harap:
            salah += 1
        print(f"{tanda} {sim} {arah} {nama} -> kirim={dapat} (harap {harap})")
    print("FILTER-LABEL:", "LOLOS SEMUA" if salah == 0 else f"{salah} KASUS SALAH")
    return salah


def uji_dry_ath():
    """Dry-run mesin ATH mandat 2 Nov: pindai pasar luas, tak kirim apa pun."""
    try:
        import balas_telegram as bt
    except Exception as e:
        print("IMPORT-GAGAL:", repr(e)[:120])
        return 1
    try:
        hasil = bt.ath_cepat("x", paksa=True, dry=True)
        print("ATH81-DRY:", hasil)
        return 0 if hasil.startswith("DRY") else 1
    except Exception as e:
        print("DRY-ERR:", repr(e)[:200])
        return 1


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "semua"
    kode = 0
    if mode in ("semua", "filter"):
        kode += uji_filter()
    if mode in ("semua", "dry"):
        kode += uji_dry_ath()
    raise SystemExit(1 if kode else 0)
