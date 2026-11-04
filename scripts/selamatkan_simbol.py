#!/usr/bin/env python3
"""V308 PENYELAMAT SIMBOL — pulihkan field 'simbol' pada data/koin100.json.

Bug akar (V305): koin100_segarkan menyimpan union tanpa field 'simbol' ->
91 entri zombie buta simbol -> laporan ATH harian & radar real-time hanya
"memonitor" 0-1 koin. Sumber pemulihan: data/zai_picks_last.json (snapshot
picks terakhir, 91 entri DENGAN simbol) — fingerprint (arah, entry, target)
harus unik & sama persis. XAUUSDT dikecualikan (wajib abadi, bukan anggota pool).
"""
import json
import sys

POOL = "/home/z/my-project/data/koin100.json"
PICKS = "/home/z/my-project/data/zai_picks_last.json"


def kunci(e):
    return (str(e.get("arah")), repr(e.get("entry")), repr(e.get("target")))


def main():
    pool = json.load(open(POOL, encoding="utf-8"))
    picks = json.load(open(PICKS, encoding="utf-8"))
    zombie = [k for k in (pool.get("koin") or []) if not k.get("simbol")]
    sumber = [p for p in (picks.get("picks") or [])
              if isinstance(p, dict) and p.get("simbol") and p.get("simbol") != "XAUUSDT"]
    indeks = {}
    for p in sumber:
        indeks.setdefault(kunci(p), p)
    cocok, gagal = 0, 0
    for k in pool.get("koin") or []:
        if k.get("simbol"):
            continue
        p = indeks.get(kunci(k))
        if p is None:
            gagal += 1
            continue
        k["simbol"] = str(p["simbol"]).upper()
        cocok += 1
    pool["sumber"] = (pool.get("sumber") or "") + " + penyelamat-simbol-v308"
    with open(POOL, "w", encoding="utf-8") as f:
        json.dump(pool, f, ensure_ascii=False, indent=1)
    total_berguna = sum(1 for k in (pool.get("koin") or []) if k.get("simbol"))
    print(f"ZOMBIE={len(zombie)} COCOK={cocok} GAGAL={gagal} POOL_BER_SIMBOL={total_berguna}/{len(pool.get('koin') or [])}")
    return 0 if cocok else 1


if __name__ == "__main__":
    sys.exit(main())
