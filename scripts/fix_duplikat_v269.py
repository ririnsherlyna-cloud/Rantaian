#!/usr/bin/env python3
"""Bersihkan duplikat blok V269 akibat edit parsial (hapus dari bawah ke atas)."""
import io

P = '/home/z/my-project/micaprofita/scripts/penjaga.mjs'
with io.open(P, encoding='utf-8') as f:
    lines = f.readlines()

def hapus(mulai_1idx, sampai_1idx):
    del lines[mulai_1idx - 1: sampai_1idx]  # inklusif

# 1) duplikat diamBeruntun (baris 4954-4955 = salinan kedua)
hapus(4954, 4955)
# 2) duplikat blok SLOT-PENELITI (baris 3633-3656 = salinan kedua)
hapus(3633, 3656)

with io.open(P, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# verifikasi
teks = ''.join(lines)
assert teks.count('const diamSebelumnya') == 1, 'diamSebelumnya masih duplikat'
assert teks.count('const diamBeruntun') == 1, 'diamBeruntun masih duplikat'
print('OK — duplikat dibersihkan; diamSebelumnya ×1, diamBeruntun ×1; total baris', len(lines))
