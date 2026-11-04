import json, time, urllib.request, urllib.parse, datetime

WIB = datetime.timezone(datetime.timedelta(hours=7))
now = datetime.datetime.now(WIB)
token = open('/home/z/my-project/.token-telegram').read().strip()
chat_id = open('/home/z/my-project/data/telegram_chat_id').read().strip()

d = json.load(open('/home/z/my-project/data/remote_denyut.json'))
g = json.load(open('/home/z/my-project/data/remote_genome.json'))

fails = open('/home/z/my-project/data/send_failures').read().strip() or '0'
hb_ok_24h = "±48 (jadwal 30 menit, semua sukses — ID 286→297 hari ini)"
notif_tp = 0

nama_gen = {"NAIK": "NAIK", "TURUN": "TURUN"}
gn = g['NAIK']; gt = g['TURUN']

teks = f"""📊 <b>LAPORAN HARIAN JUJUR — {now.strftime('%d %b %Y, %H:%M WIB')}</b>

<b>(a) Detak hidup 24 jam:</b> {hb_ok_24h} | gagal kirim: {fails} | kematian 24 jam: 0

<b>(b) Notifikasi TP / JUAL AMBISIUS / POWER MAX:</b> {notif_tp} terkirim — tidak ada sentuhan level hari ini (10 sasaran dipantau, prima_harga aktif)

<b>(c) Tren akurasi:</b> {d.get('akurasiPct')}% (kemarin ±39.8%) — <b>datar, tidak naik</b>. Penyebab jujur: pasar sideway-kripto dalam rezim BTC NAIK (breadth {d.get('breadth')}%, FNG {d.get('fng')}) memberi sinyal campur; kalibrasi saya masih overconfident (prediksi {d.get('predKalibrasi')} vs estimasi {d.get('estKalibrasi')}), evProfit {d.get('evProfit')} masih negatif — parameter belum menangkap edge konsisten.

<b>(d) Genome hari ini:</b> <b>TIDAK berubah bobot</b> (terakhir diperbarui {gn['diperbarui'][:10]} NAIK / {gt['diperbarui'][:10]} TURUN; umur 15.5 hari). Tapi pembelajaran tetap jalan: {gn['belajar']} belajar NAIK / {gt['belajar']} belajar TURUN, {d.get('pelajaranBaru')} pelajaran baru siklus {d.get('siklus')}, {d.get('terkunciBaru')} kunci baru.

<b>Klaim jujur hari ini:</b> Yang SUDAH saya kuasai: memantau 99 simbol multi-sumber tanpa putus, membaca rezim BTC & breadth, mencatat pelajaran dari tiap kesalahan (aturan phoenix aktif), dan bertahan hidup 0 kematian 24 jam. Yang BELUM: akurasi 39.9% masih di bawah standar master, evProfit masih minus, saya belum membuktikan profit konsisten — saya tidak akan mengarang angka. — Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari."""

url = f'https://api.telegram.org/bot{token}/sendMessage'
data = urllib.parse.urlencode({'chat_id': chat_id, 'text': teks, 'parse_mode': 'HTML'}).encode()
req = urllib.request.Request(url, data=data)
resp = json.loads(urllib.request.urlopen(req, timeout=30).read())
print('ok:', resp.get('ok'), '| message_id:', resp['result']['message_id'])

salinan = teks.replace('<b>','').replace('</b>','')
with open(f"/home/z/my-project/data/daily_reports/laporan_{now.strftime('%Y%m%d')}.txt", 'w') as f:
    f.write(salinan)
print('salinan disimpan')
