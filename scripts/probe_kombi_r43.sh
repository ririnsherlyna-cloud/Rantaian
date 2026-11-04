#!/bin/bash
# KOMBINASI FINAL r43 — semua fix lolos kalibrasi aktif bersama.
cd /home/z/my-project
ENV="T9BUG,T11VETO,T6X,T0NLEV,T14,T15,R2MIKRO,T4VETO,L8SKIP,T16,T16M12,T1DEMA2,FDECAY,L7DUAL"
FBO_R43="$ENV" timeout 580 bun scripts/batch_r43.ts --dari fbo100 --sampai fbo2400 --save r43v3-KOMBINASI.json > research/ujian-fbo/r43v3-KOMBINASI.txt 2>&1
rg "^fbo[0-9]+:|^TOTAL" research/ujian-fbo/r43v3-KOMBINASI.txt
echo "KOMBINASI-DONE"
