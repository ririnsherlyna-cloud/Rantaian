#!/bin/bash
# PROBE KALIBRASI r43 v2 — fix terkalibrasi diukur ulang standalone.
cd /home/z/my-project
FIXES="T9BUG T11VETO T6X T0NLEV T1VFP T14 T15 R2MIKRO"
for f in $FIXES; do
  FBO_R43="$f" timeout 580 bun scripts/batch_r43.ts --dari fbo100 --sampai fbo2400 --save "r43v2-$f.json" > research/ujian-fbo/r43v2-$f.txt 2>&1
  tot=$(rg "^TOTAL" research/ujian-fbo/r43v2-$f.txt | head -1)
  echo "FIX=$f $tot"
done
# KOMBINASI PENUH (semua fix lolos kalibrasi)
FBO_R43="T9BUG,T11VETO,T6X,T0NLEV,T1VFP,T14,T15,R2MIKRO" timeout 580 bun scripts/batch_r43.ts --dari fbo100 --sampai fbo2400 --save r43v2-KOMBINASI.json > research/ujian-fbo/r43v2-KOMBINASI.txt 2>&1
rg "^TOTAL" research/ujian-fbo/r43v2-KOMBINASI.txt
echo "ALL-DONE-V2"
