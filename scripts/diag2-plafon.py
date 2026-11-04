#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diag2: plafon terbit dari mask V301e di soal.pkl — per bucket, kolom terbaik."""
import pickle
from collections import defaultdict

import numpy as np

P_SOAL = '/home/z/my-project/scripts/ambisius-v301-soal.pkl'
with open(P_SOAL, 'rb') as f:
    soal = pickle.load(f)
print(f'soal: {len(soal)}')

nKol = 60
per_bucket = defaultdict(list)
for s in soal:
    per_bucket[s['bucket']].append(s)

total_maks = 0
n_lulus_saja = 0
for bk in sorted(per_bucket.keys()):
    S = per_bucket[bk]
    n = len(S)
    M = np.stack([s['mask'].reshape(-1) for s in S])
    jumlah_kolom = M.sum(axis=0)
    maks = int(jumlah_kolom.max()) if len(jumlah_kolom) else 0
    ada = int((M.sum(axis=1) > 0).sum())
    n_lulus_saja += ada
    total_maks += maks
    print(f'{bk}: n={n} · ada-lulus={ada} ({ada / n * 100:.0f}%) · kolom-terbaik={maks} ({maks / n * 100:.0f}%)')

print(f'PLAFON TERBIT GLOBAL (Σ kolom-terbaik): {total_maks} dari {len(soal)} ({total_maks / len(soal) * 100:.1f}%)')
print(f'jumlah soal dgn >=1 lulus: {n_lulus_saja} ({n_lulus_saja / len(soal) * 100:.1f}%)')
