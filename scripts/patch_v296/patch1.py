#!/usr/bin/env python3
# Patch V296 hidup.html — versi anchor-kecil (tahan karakter unicode).
import io

F = '/home/z/my-project/hidup_repo/hidup.html'
src = io.open(F, encoding='utf-8').read()
ori_len = len(src)
log = []

# ---------- 1. Ganti function susun(){ ... POND_POS={};\n} ----------
awal = src.index('function susun(){')
akhir_marker = '  POND_POS={};\n}'
akhir = src.index(akhir_marker, awal) + len(akhir_marker)
baru = io.open('/home/z/my-project/scripts/patch_v296/susun_baru.js', encoding='utf-8').read().rstrip('\n')
src = src[:awal] + baru + src[akhir:]
log.append(f'1. susun() diganti ({akhir-awal} -> {len(baru)} char)')

# ---------- 2a. Guard kanal sayap (mode teras tak gambar kurva sayap) ----------
lama = 'if(gz2&&bz2){'
assert src.count(lama) == 1, f'2a count={src.count(lama)}'
src = src.replace(lama, "if(gz2&&bz2&&LAYOUT.mode!=='teras'){", 1)
log.append('2a. guard kanal sayap OK')

# ---------- 2b. Bungkus blok cincin: else-branch teras ----------
lama = "  const nC=Math.max(2, Math.min(3, ist.cincin||2));"
assert src.count(lama) == 1, f'2b count={src.count(lama)}'
baru = ("  if(LAYOUT.mode==='teras'){\n"
        "    cx.save(); cx.setLineDash([2,5]); cx.lineDashOffset=-t*10;\n"
        "    cx.strokeStyle='rgba(79,224,194,.055)'; cx.lineWidth=1;\n"
        "    cx.beginPath(); cx.moveTo(den.x, den.y+den.r); cx.lineTo(den.x, LAYOUT.pond.y+LAYOUT.pond.h*0.35); cx.stroke();\n"
        "    cx.restore();\n"
        "  } else {\n"
        "  const nC=Math.max(2, Math.min(3, ist.cincin||2));")
src = src.replace(lama, baru, 1)
log.append('2b. buka else-branch cincin OK')

# ---------- 2c. Tutup else-branch sebelum komentar KANAL SAYAP ----------
lama = '  }\n  // KANAL SAYAP'
assert src.count(lama) == 1, f'2c count={src.count(lama)}'
src = src.replace(lama, "  }\n  }\n  // KANAL SAYAP", 1)
log.append('2c. tutup else-branch cincin OK')

# ---------- 3. Sumbu kubah -> ruang (kardinal vs teras) ----------
lama = """    if(z.jenis==='kardinal'){
      cx.strokeStyle='rgba(79,224,194,.045)'; cx.lineWidth=1;
      cx.beginPath(); cx.moveTo(den.x, den.y); cx.lineTo(z.cx, z.cy); cx.stroke();
    }"""
assert src.count(lama) == 1, f'3 count={src.count(lama)}'
baru = lama + """
    } else if(z.jenis==='teras'||z.jenis==='gudang'||z.jenis==='brankas'){
      // sumbu terasering: dari kubah ke puncak tiap ruang — tertib, tak melintas isi ruang
      cx.strokeStyle='rgba(79,224,194,.04)'; cx.lineWidth=1;
      cx.beginPath(); cx.moveTo(den.x, den.y); cx.lineTo(z.cx, z.rect.y+6); cx.stroke();"""
# perhatikan: lama diakhiri '    }' — kita ganti penutup itu jadi bagian dari if/else:
# cara aman: replace lama dengan versi tanpa penutup terakhir lalu tambah penutup.
lama_tanpa_tutup = lama[:-len("\n    }")]
src = src.replace(lama, lama_tanpa_tutup + baru[len(lama):] + "\n    }", 1)
log.append('3. sumbu terasering OK')

# ---------- 4. Sub-teks GUDANG kapasitas jujur ----------
lama = "? (z.n?`${z.n} buku luberan dari rak penuh`:'kosong"
assert src.count(lama) == 1, f'4 count={src.count(lama)}'
baru = "? (z.n?`${z.n} buku luberan${(z.rakMuatG!=null&&z.rakMuatG<z.n)?` · rak penuh ${z.rakMuatG}, sisanya menunggu ruang baru`:''}`:'kosong"
src = src.replace(lama, baru, 1)
log.append('4. sub-teks gudang OK')

io.open(F, 'w', encoding='utf-8').write(src)
print('\n'.join(log))
print(f'ukuran: {ori_len} -> {len(src)} char')
