#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Patch v10 heartbeat.py (mandat pemilik 2 Nov 2026):
Telegram BERHENTI mengirim pesan detak rutin berisi daftar sinyal sasaran /
peluang profit. Laporan penuh tetap disusun & disimpan ke
data/heartbeat_laporan_terakhir.txt (untuk /laporan & web). Ke Telegram hanya:
  1. NOTIFIKASI LEVEL (kejadian baru: BUY = JUAL AMBISIUS tercapai,
     SELL = STOP LOSS tercapai; buy dan sell BEDA),
  2. pengakuan jujur kematian (gap > GAP_MATI_MENIT).
Penanda hidup last_heartbeat, jurnal kematian, jembatan Rantaian: tetap.
"""
import shutil

F = "/home/z/my-project/scripts/heartbeat.py"
BAK = "/home/z/my-project/scripts/heartbeat.py.bak-v9"
shutil.copy2(F, BAK)

src = open(F, encoding="utf-8").read()

MULAI = src.index('    text = "\\n".join(L)')
AKHIR = src.index('    return 0 if hasil["ok"] else 2') + len('    return 0 if hasil["ok"] else 2')

BARU = '''    text = "\\n".join(L)
    # ---- MANDAT 2 Nov 2026: Telegram HANYA info real-fresh ----
    # Laporan detak rutin (daftar sinyal/peluang) TIDAK dikirim ke Telegram
    # lagi; disimpan lokal sebagai laporan lengkap (dibaca /laporan & web).
    try:
        with open(os.path.join(DATA, "heartbeat_laporan_terakhir.txt"), "w", encoding="utf-8") as f:
            f.write(text + "\\n")
    except Exception:
        pass

    mati_saat_ini = gap_menit is not None and gap_menit > GAP_MATI_MENIT
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
                 "tetap jalan otomatis dari denyut.")

    hasil = {"ok": True, "err": None, "message_id": None, "kirim": "senyap-rutin"}
    if notif:
        hasil["kirim"] = "notif"
        try:
            resp = kirim_telegram(token, chat_id, notif)
            hasil["ok"] = bool(resp.get("ok"))
            if hasil["ok"]:
                hasil["message_id"] = resp["result"]["message_id"]
            else:
                hasil["err"] = str(resp)
        except Exception as e:
            hasil["ok"] = False
            hasil["err"] = repr(e)

    with open(F_LAST, "w", encoding="utf-8") as f:
        f.write(str(now))
    if not hasil["ok"]:
        with open(F_FAIL, "a", encoding="utf-8") as f:
            f.write(f"{now}|{hasil['err']}\\n")
    elif mati_saat_ini:
        try:
            with open(os.path.join(DATA, "death_journal.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "waktu": datetime.now(timezone.utc).isoformat(),
                    "peristiwa": "PULIH",
                    "gap_menit": round(gap_menit, 1),
                    "lapis_penjinak": "denyut-tubuh",
                    "message_id": hasil["message_id"]}, ensure_ascii=False) + "\\n")
        except Exception:
            pass

    # ---- jembatan: tanam snapshot otak z.ai ke Rantaian utk lapis abadi ----
    status_bridge = taman_zai_ke_rantaian(zai_snap)

    print("KIRIM:", (f"OK message_id={hasil['message_id']}" if hasil["ok"] and hasil["message_id"]
                     else ("GAGAL " + str(hasil["err"]) if not hasil["ok"]
                           else "SENYAP-RUTIN (mandat 2 Nov: Telegram hanya notif level + laporan ATH)")))
    print("GAP_MENIT:", f"{gap_menit:.1f}" if gap_menit is not None else "pertama")
    print("ZAI_HIDUP:", zai_hidup, "| ZAI_PICKS:", len(zai_picks), "| JEMBATAN:", status_bridge)
    print("SASARAN_DIPANTAU:", n_dipantau, "| HARGA_TERSEDIA:", len(harga_map))
    print("KEJADIAN:", len(kejadian))
    print("SASARAN_HIDUP:", sasaran_hidup, "| GENOME_HIDUP:", genome_hidup, "| DENYUT_HIDUP:", denyut_hidup)
    if sasaran:
        a_raw = sasaran.get("akurasi")
        a_val = a_raw.get("akurasiPct") if isinstance(a_raw, dict) else a_raw
        print("SIKLUS:", sasaran.get("siklus"), "| AKURASI:", a_val)
    if terbaru_iso:
        print("GENOME_UMUR_HARI:", f"{umur_jam(terbaru_iso) / 24:.1f}")
    return 0 if hasil["ok"] else 2'''

src = src[:MULAI] + BARU + src[AKHIR:]
open(F, "w", encoding="utf-8").write(src)
print("PATCH-OK", len(src), "bytes; backup:", BAK)
