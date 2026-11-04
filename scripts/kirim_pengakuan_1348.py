#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pengakuan kematian + forensik senyap-Telegram utk pemilik (2 Nov, pasca-recycle).
Impor kirim_telegram dari heartbeat.py (jalur kirim bot sendiri, HTML, pecah >3900)."""
import sys, os, json

sys.path.insert(0, "/home/z/my-project/scripts")
from heartbeat import kirim_telegram  # noqa: E402

BASE = "/home/z/my-project"
token = open(f"{BASE}/.token-telegram").read().strip()
chat_id = open(f"{BASE}/data/telegram_chat_id").read().strip()

# Gap terukur saat kebangkitan (sebelum last_heartbeat ditulis-ulang daemon):
# penjaga_nyala 13256s, last_heartbeat 13902s -> mati ~3 jam 45 menit (±11:05-13:50 WIB)
msg = (
    "🩺 <b>PENGAKUAN JUJUR — kenapa Anda tidak dapat notifikasi</b>\n\n"
    "<b>1) Saya sempat MATI sekitar 3 jam 45 menit</b> (±11:05–13:50 WIB) dan baru pulih sekarang. "
    "Sandbox tempat saya hidup di-recycle: daemon penjaga, detak jantung, dan watchdog lokal ikut mati serentak. "
    "Selama window itu TIDAK ada yang bisa mengirim notif apa pun — kejadian pasar yang lewat tidak sempat tertangkap.\n\n"
    "<b>2) Sebagian senyap memang perintah Anda sendiri (mandat 2 Nov, 09:55 WIB):</b>\n"
    "• Daftar sinyal rutin = SENYAP dari Telegram (laporan penuh disimpan untuk /laporan)\n"
    "• Yang lolos hanya: notif level sinyal kunci (BUY → JUAL AMBISIUS tercapai, SELL → STOP LOSS tercapai), laporan ATH harian (terkirim 10:04 WIB), tanda hidup berkala\n\n"
    "<b>3) KEJADIAN 0 bukan sensor — sinyal kunci hari ini hanya 1:</b>\n"
    "• CRV (SELL) entry 0.2728 · stop 0.2887 · target 0.2642 — level-nya <b>belum tersentuh</b>, jadi memang belum ada notif level yang layak\n"
    "• 9 sasaran lain hari ini = kandidat PENELITIAN/PENGAMATAN tanpa level (hukum V301-SASARAN-10, gerbang forensik)\n\n"
    "<b>4) Status sekarang — semua hidup kembali:</b>\n"
    "• Denyut penjaga segar, detak jantung berjalan lagi\n"
    "• Tanda hidup terkirim (message_id 656, kini tiap 1 jam)\n"
    "• Lapis abadi GitHub Actions tidak pernah mati (run segar 2 menit)\n"
    "• Deteksi level senjap: 10 sasaran termuat, harga 95/95 simbol tersedia\n\n"
    "Kalau Anda ingin notifikasi <i>lebih ramai</i> — daftar sinyal rutin kembali atau peringatan pergerakan besar pasar — katakan saja, mandat saya ubah seketika.\n\n"
    "Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari."
)

hasil = kirim_telegram(token, chat_id, msg)
print("HASIL:", json.dumps(hasil if isinstance(hasil, dict) else {"raw": str(hasil)})[:200])
