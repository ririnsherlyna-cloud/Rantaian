#!/usr/bin/env python3
# BUILD hidup.html V284-PROTOLIFE — sisipkan engine_core + engine_world + ui ke template.
import io, os

BASE = '/home/z/my-project/scripts/kehidupan'
KELUAR = '/home/z/my-project/download/hidup.html'

def baca(nama):
    with io.open(os.path.join(BASE, nama), 'r', encoding='utf-8') as f:
        return f.read()

tpl = baca('template.html')
for penanda, berkas in [('/*__ENGINE_CORE__*/', 'engine_core.js'),
                        ('/*__ENGINE_WORLD__*/', 'engine_world.js'),
                        ('/*__UI__*/', 'ui.js')]:
    isi = baca(berkas)
    assert '</script' not in isi.lower(), 'JS memuat </script>: ' + berkas
    tpl = tpl.replace(penanda, isi)

sisa = tpl.count('__ENGINE') + tpl.count('__UI__')
assert sisa == 0, 'penanda tersisa: %d' % sisa

with io.open(KELUAR, 'w', encoding='utf-8') as f:
    f.write(tpl)
print('OK  %s (%d bytes, %d baris)' % (KELUAR, len(tpl.encode('utf-8')), tpl.count('\n') + 1))
