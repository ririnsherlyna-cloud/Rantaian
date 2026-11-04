#!/usr/bin/env python3
# TELAAH AKURASI — kenapa cumRet turun dari >200% ke ~142%?
# Rekonstruksi kurva ekuitas MICAPROFITA per hari dari tabel Pick (sumber sama dgn arena).
import sqlite3, json
from collections import defaultdict

c = sqlite3.connect('/home/z/my-project/db/custom.db')
rows = c.execute("""
  select bd.day, p.direction, p.ret, p.hit, p.symbol, p.confidence
  from Pick p join BattleDay bd on bd.id=p.battleDayId
  where p.competitor='MICAPROFITA' and p.ret is not null and bd.day is not null
  order by bd.day asc
""").fetchall()

per_day = defaultdict(list)
for day, arah, ret, hit, sym, conf in rows:
    per_day[day].append((float(ret) if ret is not None else 0.0, sym, arah, conf))

# Rekonstruksi: ret di DB = return harian per pick (rata-rata sama-rata per hari, seperti arena)
cum = 0.0
peak = 0.0; peak_day = ''
print(f"{'hari':<12} {'n':>3} {'retHari':>9} {'cumRet':>9} {'ket'}")
hist = []
for day in sorted(per_day):
    rets = per_day[day]
    rata = sum(r for r, *_ in rets) / len(rets)
    cum += rata
    hist.append((day, len(rets), rata, cum))
    if cum > peak: peak, peak_day = cum, day

for day, n, rata, cum in hist:
    ket = ''
    if day == peak_day: ket = '<- PUNCAK'
    if cum < peak - 0.15 and day > peak_day: ket = '  (turun dr puncak)'
    print(f"{day:<12} {n:>3} {rata*100:>8.2f}% {cum*100:>8.2f}%{ket}")

print(f"\nPUNCAK: {peak*100:.1f}% pada {peak_day}")
print(f"KINI  : {cum*100:.1f}%  → penurunan {(peak-cum)*100:.1f} poin dari puncak")

# Bedah hari terburuk pasca-puncak
print("\n=== 10 HARI TERBURUK pasca puncak ===")
pasca = [h for h in hist if h[0] > peak_day]
for day, n, rata, cum in sorted(pasca, key=lambda x: x[2])[:10]:
    print(f"{day:<12} n={n:<3} {rata*100:>8.2f}%")

# Berapa picks per hari dulu vs sekarang (efek pelebaran universe?)
print("\n=== JUMLAH PICK PER HARI (awal vs kini) ===")
days = sorted(per_day)
for d in days[:5] + days[-8:]:
    rets = per_day[d]
    rata = sum(r for r, *_ in rets)/len(rets)
    print(f"{d:<12} n={len(rets):<3} rata {rata*100:>7.2f}%")
