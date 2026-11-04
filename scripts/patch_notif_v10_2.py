#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Patch v10.2 — akar insiden kejadian-massal (166):
1. balas_telegram.py: state level penjaga pindah ke file sendiri
   data/penjaga_level_state.json (nested) — tak lagi tertabrak skema flat
   heartbeat; batas tampil kejadian 15 + ringkasan sisa.
2. heartbeat.py: pantau_level_arena jadi read-only (tanpa tulis state arena —
   skema flat tidak pernah menimpa state penjaga lagi); Telegram dari
   heartbeat HANYA pengakuan mati (notifikasi level = tugas penjaga_level_cepat).
"""
import shutil

# ---------- balas_telegram.py ----------
F1 = "/home/z/my-project/scripts/balas_telegram.py"
shutil.copy2(F1, F1 + ".bak-v101")
s = open(F1, encoding="utf-8").read()
s = s.replace('F_ARENA_LEVEL_81 = "/home/z/my-project/data/arena_level_state.json"  # state level bersama tubuh z.ai',
              'F_ARENA_LEVEL_81 = "/home/z/my-project/data/penjaga_level_state.json"  # state level penjaga (nested, file sendiri — v10.2)')
# batas tampil kejadian + ringkasan sisa
LAMA = '''        for sim, arah, nama, nilai, h, ent, pertama in kejadian:
            ikon = "\\U0001F525" if nama == "JUAL AMBISIUS" else "\\U0001F6D1"
            nama_t = "JUAL AMBISIUS" if nama == "JUAL AMBISIUS" else "STOP LOSS"
            pct = f"{(h / ent - 1) * 100:+.2f}%" if ent else ""
            pl = f"{(h / nilai - 1) * 100:+.2f}%" if nilai else ""
            tanda = " <i>(sudah di level saat pemantauan menyala)</i>" if pertama else ""
            baris.append(f"{ikon} <b>{nama_t} TERCAPAI \\u2014 {html.escape(sim)} ({html.escape(str(arah))})</b>{tanda}")
            baris.append(f"Harga kini {fmt_harga(h)} · level {fmt_harga(nilai)} ({pl} dari level)"
                         + (f" · entry {fmt_harga(ent)} ({pct})" if ent else ""))'''
BARU = '''        _tampil = kejadian[:15]
        for sim, arah, nama, nilai, h, ent, pertama in _tampil:
            ikon = "\\U0001F525" if nama == "JUAL AMBISIUS" else "\\U0001F6D1"
            nama_t = "JUAL AMBISIUS" if nama == "JUAL AMBISIUS" else "STOP LOSS"
            pct = f"{(h / ent - 1) * 100:+.2f}%" if ent else ""
            pl = f"{(h / nilai - 1) * 100:+.2f}%" if nilai else ""
            tanda = " <i>(sudah di level saat pemantauan menyala)</i>" if pertama else ""
            baris.append(f"{ikon} <b>{nama_t} TERCAPAI \\u2014 {html.escape(sim)} ({html.escape(str(arah))})</b>{tanda}")
            baris.append(f"Harga kini {fmt_harga(h)} · level {fmt_harga(nilai)} ({pl} dari level)"
                         + (f" · entry {fmt_harga(ent)} ({pct})" if ent else ""))
        if len(kejadian) > 15:
            baris.append(f"<i>…dan {len(kejadian) - 15} kejadian level lainnya detak ini (semua tercatat di state penjaga).</i>")'''
assert LAMA in s, "blok kejadian balas_telegram tak ketemu"
s = s.replace(LAMA, BARU)
open(F1, "w", encoding="utf-8").write(s)
print("PATCH balas_telegram OK")

# ---------- heartbeat.py ----------
F2 = "/home/z/my-project/scripts/heartbeat.py"
shutil.copy2(F2, F2 + ".bak-v101")
h = open(F2, encoding="utf-8").read()
# (a) pantau_level_arena read-only: jangan tulis state arena lagi
LAMA2 = '''    if kunci_semua - set(state):
        state.update({k: datetime.now(timezone.utc).isoformat() for k in kunci_semua - set(state)})
        if len(state) > 600:  # pangkas tertua (ISO string urut alfabet = urut waktu)
            state = dict(sorted(state.items(), key=lambda kv: kv[1])[-500:])
        simpan_json(F_ARENA_LEVEL, state)
    return kejadian'''
BARU2 = '''    # v10.2 READ-ONLY: penulisan state arena DIHENTIKAN — notifikasi level
    # adalah tugas penjaga_level_cepat (balas_telegram) dengan state nested
    # sendiri; skema flat lama pernah menimpa state itu -> kejadian massal.
    return kejadian'''
assert LAMA2 in h, "blok state arena tak ketemu"
h = h.replace(LAMA2, BARU2)
# (b) Telegram heartbeat: hanya pengakuan mati
LAMA3 = '''    mati_saat_ini = gap_menit is not None and gap_menit > GAP_MATI_MENIT
    notif = None
    if kejadian:
        nl = ["\\U0001F6A8 <b>NOTIFIKASI LEVEL \\u2014 level tercapai</b>", ""]
        if mati_saat_ini:
            nl.insert(1, f"\\u26a0\\ufe0f <i>Saya sempat MATI {gap_menit:.0f} menit dan baru pulih \\u2014 pengakuan jujur.</i>")
        for sim, arah, level_nama, level_nilai, harga, entry, pertama in kejadian:
            nl.append(label_sentuh(sim, arah, level_nama, level_nilai, harga, entry, pertama))
        nl.append("")
        nl.append("<i>BUY = HARGA AMBISIUS tercapai \\u00b7 SELL = STOP LOSS tercapai (buy dan sell BEDA) \\u00b7 "
                  "dikirim mandiri dari denyut otak z.ai tanpa menunggu chat apa pun.</i>")
        notif = "\\n".join(nl)
    elif mati_saat_ini:
        notif = (f"\\u26a0\\ufe0f <b>Saya sempat MATI selama {gap_menit:.0f} menit dan baru pulih sekarang</b> \\u2014 "
                 "pengakuan jujur. Notifikasi level (BUY ambisius / SELL stop loss) & laporan harian ATH "
                 "tetap jalan otomatis dari denyut.")'''
BARU3 = '''    mati_saat_ini = gap_menit is not None and gap_menit > GAP_MATI_MENIT
    notif = None
    # v10.2: Telegram dari heartbeat HANYA pengakuan kematian. Notifikasi level
    # (BUY ambisius / SELL stop loss) dikirim penjaga_level_cepat tiap denyut 5
    # mnt; laporan harian ATH dikirim ath_cepat — tidak ada yang dobel.
    if mati_saat_ini:
        notif = (f"\\u26a0\\ufe0f <b>Saya sempat MATI selama {gap_menit:.0f} menit dan baru pulih sekarang</b> \\u2014 "
                 "pengakuan jujur. Notifikasi level (BUY ambisius / SELL stop loss) & laporan harian ATH "
                 "tetap jalan otomatis dari denyut.")'''
assert LAMA3 in h, "blok notif heartbeat tak ketemu"
h = h.replace(LAMA3, BARU3)
open(F2, "w", encoding="utf-8").write(h)
print("PATCH heartbeat OK")
