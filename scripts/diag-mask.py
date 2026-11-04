#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diagnosa mask_lulus_slot: dari soal.pkl, pecah alasan kegagalan per langkah
(entry tak kena / stop dulu / ambisius tak kena / tak longsor / dilampaui)."""
import pickle
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, '/home/z/my-project/scripts')
import importlib.util
_spec = importlib.util.spec_from_file_location('uamb', '/home/z/my-project/scripts/ujian-ambisius.py')
uamb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uamb)
DIR_PROYEK = uamb.DIR_PROYEK
JENDELA_BAR15 = uamb.JENDELA_BAR15
KAPR = uamb.KAPR
L_LNGSR = uamb.L_LNGSR
K_GRID = uamb.K_GRID
TIP_LIST = uamb.TIP_LIST
STOP_K = uamb.STOP_K
TOL_LAMPAU = uamb.TOL_LAMPAU
muat_data = uamb.muat_data
import os

P_SOAL = os.path.join(DIR_PROYEK, 'scripts', 'ambisius-v301-soal.pkl')
with open(P_SOAL, 'rb') as f:
    soal = pickle.load(f)
print(f'soal: {len(soal)}')

per_sym = {}
for s in soal[:3000]:
    per_sym.setdefault(s['sym'], []).append(s)

alasan = Counter()
kolom_lulus = Counter()
n_ada_lulus = 0
n_cek = 0
for sym, L in per_sym.items():
    d = muat_data(sym)
    h5, l5 = d['h5'], d['l5']
    for s in L:
        n_cek += 1
        f = s['fitur']
        i5s = int(np.searchsorted(d['ot5'], s['ts'], side='left'))
        w_h = h5[i5s:i5s + JENDELA_BAR15]
        w_l = l5[i5s:i5s + JENDELA_BAR15]
        atr = f['atr']; R = f['R']
        nL = 0
        for ti, tip in enumerate(TIP_LIST):
            E = f['last'] + tip * atr
            S = E - STOP_K * atr
            kRcap = (R + KAPR * atr - E) / atr
            iE = int(np.argmax(w_l <= E)) if np.any(w_l <= E) else -1
            if iE < 0:
                alasan['entry-tak-kena'] += 1
                continue
            iS = int(np.argmax(w_l <= S)) if np.any(w_l <= S) else -1
            ambangA = E + np.minimum(np.array(K_GRID), kRcap) * atr
            ge = w_h[:, None] >= ambangA[None, :]
            adaA = ge.any(axis=0)
            kenaA = np.where(adaA, ge.argmax(axis=0), -1)
            sufmax = np.maximum.accumulate(w_h[::-1])[::-1]
            idxs = np.arange(len(w_h))
            ambL = ambangA - L_LNGSR * atr
            lm = w_l[:, None] <= ambL[None, :]
            for k in range(len(K_GRID)):
                iA = int(kenaA[k])
                if iA < 0:
                    alasan['ambisius-tak-kena'] += 1
                    continue
                if iS >= 0 and iS < iA:
                    alasan['stop-dulu'] += 1
                    continue
                sah = lm[:, k] & (idxs >= iA)
                if not np.any(sah):
                    alasan['tak-longsor'] += 1
                    continue
                if sufmax[iA] > ambangA[k] * (1 + TOL_LAMPAU):
                    alasan['dilampaui'] += 1
                    continue
                nL += 1
                alasan['LULUS'] += 1
        kolom_lulus[nL] += 1
        if nL > 0:
            n_ada_lulus += 1

print(f'dicek {n_cek} soal · ada >=1 lulus: {n_ada_lulus} ({n_ada_lulus / max(1, n_cek) * 100:.1f}%)')
print('alasan kegagalan (per kombinasi tip×k):')
for a, c in alasan.most_common():
    print(f'  {a}: {c}')
print('distribusi #kolom lulus per soal:', dict(sorted(kolom_lulus.items())[:8]))
