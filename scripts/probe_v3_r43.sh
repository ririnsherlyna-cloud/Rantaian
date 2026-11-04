#!/bin/bash
# PROBE KALIBRASI r43 v3 — fix generasi-3 standalone.
cd /home/z/my-project
FIXES="T4VETO L8SKIP T16M12 T1DEMA2 FDECAY L7DUAL"
for f in $FIXES; do
  case "$f" in
    T16M12) ENV="T16,T16M12" ;;
    *) ENV="$f" ;;
  esac
  FBO_R43="$ENV" timeout 580 bun scripts/batch_r43.ts --dari fbo100 --sampai fbo2400 --save "r43v3-$f.json" > research/ujian-fbo/r43v3-$f.txt 2>&1
  tot=$(rg "^TOTAL" research/ujian-fbo/r43v3-$f.txt | head -1)
  echo "FIX=$f $tot"
done
echo "ALL-DONE-V3"
