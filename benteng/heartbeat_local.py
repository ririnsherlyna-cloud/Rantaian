#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HEARTBEAT MICROPROFITA GEN-2 — detak hidup + penjaga TP/Jual Ambisius/Power Max.
Sumber data: repo HIDUP ririnsherlyna-cloud/Micaprofita- (raw), fallback cache lokal.
Setiap detak (tiap 30 menit):
  1. Tarik sasaran-terkini.json + genome-server.json + denyut-server.jsonl (remote live)
  2. Tarik harga kini tiap sasaran dari Binance (data-api.binance.vision, gratis)
  3. Deteksi SENTUHAN level: TP (target), JUAL AMBISIUS, POWER MAX, STOP
     -> perubahan sejak detak lalu = notifikasi khusus
  4. Kirim laporan jujur ke Telegram (harga mikro tampil utuh, bukan 0)
Hukum benteng: gap > 35 menit = MATI -> pengakuan wajib + jurnal kematian.
"""
import json
import os
import time
import html
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from decimal import Decimal

BASE = "/home/z/my-project"
DATA = os.path.join(BASE, "data")
F_LAST = os.path.join(DATA, "last_heartbeat")
F_FAIL = os.path.join(DATA, "send_failures")
F_CHAT = os.path.join(DATA, "telegram_chat_id")
F_TOKEN = os.path.join(BASE, ".token-telegram")
F_SNAP = os.path.join(DATA, "sasaran_state.json")
RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
BINANCE = "https://data-api.binance.vision/api/v3/ticker/price"
WIB = timezone(timedelta(hours=7))
GAP_MATI_MENIT = 35
LABEL_LEVEL = {"TP": "TP SASARAN", "JUAL AMBISIUS": "JUAL AMBISIUS",
               "POWER MAX AMBISIUS": "POWER MAX AMBISIUS", "STOP": "STOP (batal)"}


# ---------------- util dasar ----------------
def baca(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return None


def muat_json_lokal(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def simpan_json(path, obj):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
    except Exception as e:
        print("gagal simpan", path, repr(e))


def muat_json_remote(jalur, nama_cache):
    """Ambil file dari repo hidup; gagal -> pakai cache detak lalu."""
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            obj = json.loads(r.read().decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        obj = muat_json_lokal(cache)
        return obj, False


def jsonl_remote_terakhir(jalur, nama_cache):
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            lines = [l for l in r.read().decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        return muat_json_lokal(cache), False


def umur_jam(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600.0
    except Exception:
        return None


# ---------------- format harga mikro (WAJIB: bukan 0) ----------------
def fmt_harga(p):
    if p is None:
        return "-"
    try:
        p = float(p)
    except Exception:
        return str(p)
    if p == 0:
        return "0"
    if p >= 1000:
        return f"{p:,.2f}"
    if p >= 1:
        return f"{p:.4f}".rstrip("0").rstrip(".")
    return format(Decimal(repr(p)).normalize(), "f")


# ---------------- level sasaran ----------------
def level_dari_entri(e):
    """Kenali level dari nama kunci secara generik (struktur bisa berubah antar versi)."""
    out = {}
    for k, v in e.items():
        if not isinstance(v, (int, float)) or v <= 0:
            continue
        kl = k.lower()
        if kl == "target":
            out["TP"] = float(v)
        elif "power" in kl:
            out["POWER MAX AMBISIUS"] = float(v)
        elif "ambisius" in kl:
            out["JUAL AMBISIUS"] = float(v)
        elif kl == "stop":
            out["STOP"] = float(v)
    return out


def label_sentuh(sim, arah, level_nama, level_nilai, harga, entry, pertama=False):
    ikon = {"TP": "🎯", "JUAL AMBISIUS": "🔥", "POWER MAX AMBISIUS": "💥", "STOP": "🛑"}.get(level_nama, "🔔")
    pct = f"{(harga / entry - 1) * 100:+.2f}%" if entry else ""
    pct_level = f"{(harga / level_nilai - 1) * 100:+.2f}%" if level_nilai else ""
    tanda = " <i>(sudah di atas level saat pemantauan menyala)</i>" if pertama else ""
    return (f"{ikon} <b>{LABEL_LEVEL.get(level_nama, level_nama)} TERSSENTUH — {html.escape(sim)} ({html.escape(arah)})</b>{tanda}\n"
            f"Harga kini {fmt_harga(harga)} · level {fmt_harga(level_nilai)} ({pct_level} dari level)"
            + (f" · entry {fmt_harga(entry)} ({pct})" if entry else ""))


# ---------------- harga binance ----------------
def _basis_simbol(s):
    """'IOST'->'IOST', 'SYNUSDT'->'SYN' (otak kadang menulis pasangan utuh)."""
    s = str(s).strip().upper()
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s if s.isalnum() else None


def harga_binance(simbol_list):
    """Kembalikan {basis: harga} dari Binance data-vision (publik, tanpa kunci).
    Resilien: normalisasi simbol + fallback per-simbol — satu simbol rusak/delisted
    TIDAK boleh membutakan seluruh penjaga TP (pelajaran siklus 1235/SYNUSDT)."""
    if not simbol_list:
        return {}
    bases = sorted({b for b in (_basis_simbol(s) for s in simbol_list) if b})
    if not bases:
        return {}
    pairs = [f"{b}USDT" for b in bases]
    q = urllib.parse.quote(json.dumps(pairs, separators=(",", ":")))
    err_terakhir = None
    for host in (BINANCE, "https://api.binance.com/api/v3/ticker/price"):
        try:
            req = urllib.request.Request(f"{host}?symbols={q}", headers={"User-Agent": "microprofita-hb"})
            with urllib.request.urlopen(req, timeout=20) as r:
                arr = json.loads(r.read().decode())
            if isinstance(arr, dict):
                err_terakhir = f"body-dict: {str(arr)[:120]}"
                continue
            return {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}
        except Exception as e:
            err_terakhir = repr(e)
    # fallback per-simbol
    out = {}
    for b in bases:
        try:
            req = urllib.request.Request(f"{BINANCE}/api/v3/ticker/price?symbol={b}USDT",
                                         headers={"User-Agent": "microprofita-hb"})
            with urllib.request.urlopen(req, timeout=10) as r:
                out[b] = float(json.loads(r.read().decode())["price"])
        except Exception:
            continue
    if out:
        print(f"HARGA_FALLBACK: {len(out)}/{len(bases)} simbol (batch gagal: {err_terakhir})")
        return out
    print("HARGA_GAGAL:", err_terakhir)
    return {}


# ---------------- pemantau TP ----------------
def pantau_level(sasaran_list, harga_map):
    """Bandingkan dengan snapshot detak lalu -> daftar kejadian sentuhan baru.
    Pemanasan: detak pertama berk harga / sasaran baru -> hanya dicatat, tidak diberitahu."""
    state = muat_json_lokal(F_SNAP) or {}
    lama = state.get("level", {})
    sudah_panas = bool(state.get("prima_harga")) and bool(harga_map)
    ada_harga_sekarang = bool(harga_map)
    baru, kejadian = {}, []
    for e in sasaran_list:
        sim = e.get("simbol")
        if not sim:
            continue
        harga = harga_map.get(sim)
        lv = level_dari_entri(e)
        baru[sim] = {}
        for nama, nilai in lv.items():
            kena = bool(harga) and ((harga >= nilai) if nama != "STOP" else (harga <= nilai))
            baru[sim][nama] = kena
            sebelumnya = lama.get(sim, {}).get(nama)
            # V4: sentuhan PERTAMA pun dilaporkan — pemilik wajib tahu, bukan disembunyikan pemanasan.
            if kena and not sebelumnya and harga and (sudah_panas or sim not in lama):
                kejadian.append((sim, e.get("arah", "?"), nama, nilai, harga, e.get("entry"),
                                 sim not in lama))
    simpan_json(F_SNAP, {"waktu": time.time(), "prima_harga": ada_harga_sekarang or bool(state.get("prima_harga")), "level": baru})
    return kejadian, len(baru)


# ---------------- kirim telegram ----------------
def kirim_telegram(token, chat_id, text):
    payload = urllib.parse.urlencode({
        "chat_id": chat_id, "text": text, "parse_mode": "HTML",
        "disable_web_page_preview": "true"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage", data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def jumlah_gagal():
    try:
        cutoff = time.time() - 86400
        n = 0
        with open(F_FAIL, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    if float(line.split("|")[0]) >= cutoff:
                        n += 1
                except Exception:
                    n += 1
        return n
    except Exception:
        return 0


# ---------------- utama ----------------
def main():
    os.makedirs(DATA, exist_ok=True)
    now = time.time()
    token, chat_id = baca(F_TOKEN), baca(F_CHAT)
    if not token or not chat_id:
        print("GAGAL-LOKAL: token/chat_id tidak ada")
        return 1

    gap_menit = None
    last = baca(F_LAST)
    if last:
        try:
            gap_menit = (now - float(last)) / 60.0
        except Exception:
            pass

    # ---- jurnal kematian (LAPIS 4 benteng: kematian = data evolusi) ----
    if gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        try:
            with open(os.path.join(DATA, "death_journal.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "waktu": datetime.now(timezone.utc).isoformat(),
                    "peristiwa": "MATI-terdeteksi",
                    "gap_menit": round(gap_menit, 1),
                    "lapis_penjinak": "denyut-tubuh",
                    "status_kirim": "menyusul"}, ensure_ascii=False) + "\n")
            print(f"JURNAL: kematian tercatat ({gap_menit:.0f} menit)")
        except Exception as e:
            print("jurnal gagal:", repr(e))

    # ---- data hidup ----
    sasaran, sasaran_hidup = muat_json_remote("laporan/sasaran-terkini.json", "remote_sasaran.json")
    genome, genome_hidup = muat_json_remote("otak/genome-server.json", "remote_genome.json")
    denyut, denyut_hidup = jsonl_remote_terakhir("laporan/denyut-server.jsonl", "remote_denyut.json")

    # ---- genome: kapan terakhir tumbuh ----
    terbaru_iso, gen_maks, total_belajar = None, 0, 0

    def telusur(d):
        nonlocal terbaru_iso, gen_maks, total_belajar
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru_iso is None or umur_jam(iso) < umur_jam(terbaru_iso)):
                terbaru_iso = iso
            gen_maks = max(gen_maks, int(d.get("generasi") or 0))
            total_belajar += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)
    telusur(genome or {})

    # ---- penjaga TP ----
    daftar = (sasaran or {}).get("sasaranHariIni") or []
    simbol_list = [e.get("simbol") for e in daftar if e.get("simbol")]
    harga_map = harga_binance(simbol_list)
    kejadian, n_dipantau = [], 0
    if daftar and harga_map:
        kejadian, n_dipantau = pantau_level(daftar, harga_map)
    else:
        # detak pertama: tetap inisialisasi snapshot agar detak berikut membandingkan
        kejadian, n_dipantau = pantau_level(daftar, harga_map) if daftar else ([], 0)

    # ---- susun pesan ----
    jam = datetime.now(WIB)
    L = ["💓 <b>DETAK HIDUP — MICROPROFITA</b>",
         f"🕐 {jam.strftime('%H:%M:%S WIB, %d %b %Y')}"]
    if gap_menit is None:
        L.append("Status: <b>HIDUP</b> — detak pertama setelah pulih (tubuh sandbox di-reset; intai dibangun ulang oleh lapis penyelamat)")
    elif gap_menit > GAP_MATI_MENIT:
        L.append(f"⚠️ <b>Saya sempat MATI selama {gap_menit:.0f} menit dan baru pulih sekarang</b>")
    else:
        L.append(f"Status: <b>HIDUP</b> — {gap_menit:.0f} menit sejak detak terakhir")

    L.append("")
    if kejadian:
        L.append(f"🚨 <b>PANTAUAN SASARAN — {len(kejadian)} kejadian baru:</b>")
        for sim, arah, level_nama, level_nilai, harga, entry, pertama in kejadian:
            L.append(label_sentuh(sim, arah, level_nama, level_nilai, harga, entry, pertama))
        L.append("")
        L.append("<i>TP sasaran ≠ Jual Ambisius ≠ Power Max — tiga level berbeda, tiga keputusan berbeda.</i>")
        L.append("")

    if sasaran:
        sik = sasaran.get("siklus", "?")
        umur_s = umur_jam(sasaran.get("dihasilkan"))
        rb = sasaran.get("rezimBTC") or {}
        a_raw = sasaran.get("akurasi")
        if isinstance(a_raw, dict):
            akur = a_raw.get("akurasiPct")
            net_k = a_raw.get("netKumulatifPct")
        else:
            try:
                akur, net_k = float(a_raw), None
            except (TypeError, ValueError):
                akur, net_k = None, None
        segar = "live" if sasaran_hidup else "cache"
        L.append(f"📡 <b>Otak server</b> ({segar}): denyut siklus {sik}"
                 + (f" · {umur_s:.0f} jam lalu" if umur_s is not None else ""))
        L.append(f"🎯 Rezim BTC: <b>{html.escape(str(rb.get('rezim', '?')))}</b> "
                 f"@ {fmt_harga(rb.get('harga'))} · ATR {rb.get('atrPct', '-')}%")
        if akur is not None:
            baris_a = f"📊 Akurasi terkunci: <b>{float(akur):.1f}%</b>"
            if net_k is not None:
                baris_a += f" · net kumulatif {float(net_k):+.1f}%"
            baris_a += f" · {n_dipantau} sasaran dipantau TP/Ambisius/PowerMax"
            L.append(baris_a)
    if denyut:
        uw = denyut.get("waktu") or denyut.get("dihasilkan")
        umur_d = umur_jam(uw)
        if umur_d is not None:
            status_d = "HIDUP ✅" if umur_d < 1.5 else f"<b>terhenti {umur_d:.0f} jam</b> ⚠️"
            L.append(f"💓 Denyut otak: {status_d} ({umur_d * 60:.0f} menit lalu)")
    if terbaru_iso:
        umur_g = umur_jam(terbaru_iso)
        L.append(f"🧬 <b>Genome</b>: terakhir tumbuh {umur_g / 24:.0f} hari lalu "
                 f"(generasi {gen_maks}, {total_belajar} pembelajaran)"
                 + (" — <b>STAGNAN, saya mengakunya</b>" if umur_g > 24 * 7 else ""))
    L.append(f"🚨 Gagal kirim 24 jam: {jumlah_gagal()}")
    L.append("")
    if terbaru_iso and umur_jam(terbaru_iso) > 24 * 7:
        L.append(f"Klaim jujur: genome saya belum bertumbuh {umur_jam(terbaru_iso) / 24:.0f} hari — "
                 "saya mengakunya, dan membangunkannya adalah tugas saya berikutnya. "
                 "<b>Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari.</b>")
    else:
        L.append("<b>Klaim jujur: saya akan terus berkembang menjadi master pasar; "
                 "profit adalah yang saya pelajari.</b>")
    L.append("— detak berikutnya ± 30 menit")

    text = "\n".join(L)
    hasil = {"ok": False, "err": None, "message_id": None}
    try:
        resp = kirim_telegram(token, chat_id, text)
        hasil["ok"] = bool(resp.get("ok"))
        if hasil["ok"]:
            hasil["message_id"] = resp["result"]["message_id"]
        else:
            hasil["err"] = str(resp)
    except Exception as e:
        hasil["err"] = repr(e)

    with open(F_LAST, "w", encoding="utf-8") as f:
        f.write(str(now))
    if not hasil["ok"]:
        with open(F_FAIL, "a", encoding="utf-8") as f:
            f.write(f"{now}|{hasil['err']}\n")
    elif gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        try:
            with open(os.path.join(DATA, "death_journal.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "waktu": datetime.now(timezone.utc).isoformat(),
                    "peristiwa": "PULIH",
                    "gap_menit": round(gap_menit, 1),
                    "lapis_penjinak": "denyut-tubuh",
                    "message_id": hasil["message_id"]}, ensure_ascii=False) + "\n")
        except Exception:
            pass

    print("KIRIM:", f"OK message_id={hasil['message_id']}" if hasil["ok"] else f"GAGAL {hasil['err']}")
    print("GAP_MENIT:", f"{gap_menit:.1f}" if gap_menit is not None else "pertama")
    print("SASARAN_DIPANTAU:", n_dipantau, "| HARGA_TERSEDIA:", len(harga_map))
    print("KEJADIAN:", len(kejadian))
    print("SASARAN_HIDUP:", sasaran_hidup, "| GENOME_HIDUP:", genome_hidup, "| DENYUT_HIDUP:", denyut_hidup)
    if sasaran:
        a_raw = sasaran.get("akurasi")
        a_val = a_raw.get("akurasiPct") if isinstance(a_raw, dict) else a_raw
        print("SIKLUS:", sasaran.get("siklus"), "| AKURASI:", a_val)
    if terbaru_iso:
        print("GENOME_UMUR_HARI:", f"{umur_jam(terbaru_iso) / 24:.1f}")
    return 0 if hasil["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
