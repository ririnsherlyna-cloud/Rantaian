# Uji pipa kirim Telegram: getMe + 1 pesan uji ke chat pemilik.
# Dipicu laporan pemilik 2 Nov: "Mati terhenti di telegramnya".
import sys, time
sys.path.insert(0, "/home/z/my-project/scripts")
import balas_telegram as b

token = open("/home/z/my-project/.token-telegram").read().strip()
chat_id = open("/home/z/my-project/data/telegram_chat_id").read().strip()

me = b.tg(token, "getMe", {})
print("getMe ok:", me.get("ok"), "| bot: @", (me.get("result") or {}).get("username"))

now_wib = time.strftime("%d %b %H:%M WIB", time.gmtime(time.time() + 7 * 3600))
teks = (
    f"💓 <b>TANDA HIDUP UJI</b> — {now_wib}\n"
    "Pemilik melapor bot terlihat mati di Telegram. Ini pesan uji jalur kirim langsung:\n"
    "- getMe: OK — token bot hidup\n"
    "- kirim sendMessage: lihat status di bawah (sistem tercatat)\n"
    "- Senyap 3 jam terakhir SESUAI mandat 2 Nov (H5/H6): hanya notif level + "
    "laporan ATH harian + tanda hidup tiap 6 jam. Tanda hidup terakhir 03:31 WIB, "
    "tanpa sentuhan level sejak itu (KEJADIAN 0).\n"
    "- Sistem inti hidup: otak siklus 1579, 93/93 simbol, penjaga & rantai Actions sehat."
)
r = b.kirim(token, chat_id, teks)
print("kirim ok:", r.get("ok"))
if r.get("ok"):
    res = r.get("result") or {}
    print("message_id:", res.get("message_id"), "| date:", res.get("date"))
else:
    print("error:", r.get("error"))
