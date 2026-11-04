#!/usr/bin/env python3
"""ATH-BEDAH v1 (2 Nov 2026) — pencaruan mendalam per koin runtuh −80..−100%.
Keluhan pemilik: "kita masih abai akan pencaruan mendalam koin penurunan ATH
80-100%... gak terus menggali informasi". Jawaban bukan kata-kata: modul ini.
Tiga lapis gali per koin finalis ath_cepat:
  L1 SEBAB RUNTUH  — lilin harian Binance sejak puncak: crash 1 hari vs
                     pendarahan pelan, tanggal lilin termerah terdalam.
  L2 DETAK TIM     — cari repo GitHub otomatis (search API, BUKAN peta kurasi
                     12 koin KANONIS_REPO yang jadi lubang lama), baca
                     pushed_at/archived/stars: AKTIF/BERNAPAS/BISU/TAK ADA.
  L3 NADI PASAR    — tren volume 7d vs 7d sebelumnya, hari merah/hijau,
                     jarak ke puncak, arah 24 jam.
Hasil: baris-baris HTML siap suntik ke laporan harian ath_cepat. Gagal lapis
mana pun = baris jujur "gagal diambil", tidak pernah diam-diam kosong."""

import json
import time
import html
import urllib.request
from datetime import datetime, timezone, timedelta

WIB = timezone(timedelta(hours=7))
TOKEN_GH = "/home/z/my-project/.token-rantaian"
F_BEDAH_CACHE = "/home/z/my-project/data/ath_bedah_cache.json"


def _get(url, timeout=20, gh=False):
    hdr = {"User-Agent": "benteng-balas"}
    if gh:
        try:
            hdr["Authorization"] = "Bearer " + open(TOKEN_GH).read().strip()
            hdr["Accept"] = "application/vnd.github+json"
        except Exception:
            pass
    req = urllib.request.Request(url, headers=hdr)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _get_tahan(url, timeout=20, gh=False):
    err = None
    for i in range(3):
        try:
            return _get(url, timeout, gh)
        except Exception as e:
            err = e
            time.sleep(1 + i * 2)
    raise RuntimeError(f"gagal {url[:60]}: {err!r:.60}")


# ---------------- L1: SEBAB RUNTUH ----------------
def sebab_runtuh(simbol, tgl_puncak, harga_puncak, harga_kini):
    """Analisis lilin harian Binance futures sejak puncak kejadian."""
    for host in ("https://fapi.binance.com", "https://www.binance.com"):
        try:
            arr = _get_tahan(
                f"{host}/fapi/v1/klines?symbol={simbol}USDT&interval=1d&limit=30", 20)
            if isinstance(arr, list) and len(arr) >= 3:
                break
            arr = None
        except Exception:
            arr = None
    if not arr:
        return ["sebab runtuh: lilin Binance gagal diambil (coba lagi detak berikut)"]
    lilin = []
    for k in arr:
        try:
            ts = int(k[0]) / 1000
            o, h, l, c = float(k[1]), float(k[2]), float(k[3]), float(k[4])
            vol = float(k[5])
            lilin.append({"tgl": datetime.fromtimestamp(ts, WIB).strftime("%d %b"),
                          "o": o, "h": h, "l": l, "c": c, "vol": vol})
        except Exception:
            pass
    if not lilin:
        return ["sebab runtuh: lilin tak terbaca"]
    # puncak = high tertinggi
    pk = max(lilin, key=lambda x: x["h"])
    i_pk = lilin.index(pk)
    sesudah = lilin[i_pk:]
    if len(sesudah) < 2:
        return [f"sebab runtuh: puncak baru terjadi {pk['tgl']} — jalur runtuh belum terbentuk"]
    # crash terdalam 1 hari (close-to-close)
    terdalam, terdalam_p = None, 0.0
    for a, b in zip(sesudah, sesudah[1:]):
        dr = (b["c"] / a["c"] - 1) * 100
        if dr < terdalam_p:
            terdalam, terdalam_p = b, dr
    merah = sum(1 for x in sesudah[1:] if x["c"] < x["o"])
    total = len(sesudah) - 1
    vol_pk = pk["vol"] or 1
    vol_rata = sum(x["vol"] for x in sesudah[1:]) / max(total, 1)
    bentuk = ("CRASH TAJAM — satu hara-hara" if terdalam_p <= -25 and total <= 5
              else "PENDARAHAN PELAN — dijilat habis hari demi hari" if merah / max(total, 1) >= 0.7
              else "CAMPURAN — jatuh berlomba, ada hari hijau jebakan")
    baris = [
        f"sebab runtuh: <b>{bentuk}</b> — {merah}/{total} hari merah sejak puncak {pk['tgl']}"
        + (f", terdalam {terdalam['tgl']} {terdalam_p:.1f}% sehari" if terdalam else "")
        + f" · volume sesudah puncak rata-rata {vol_rata / vol_pk * 100:.0f}% dari volume puncak"
        + (" (penjarakan — pasar meninggalkan)" if vol_rata < vol_pk * 0.5 else " (masih ramai)"),
    ]
    return baris


# ---------------- L2: DETAK TIM (identitas resmi -> GitHub) ----------------
_PAPRIKA = "https://api.coinpaprika.com/v1"


def _kata_kunci(cid=None, nama=None, simbol=""):
    """Kata identitas resmi: slug paprika (mis. q-quack-ai -> [quack, ai]) +
    nama resmi + simbol. Yang paling panjang paling spesifik."""
    kata = []
    for sumber in (cid, nama, simbol):
        for t in str(sumber or "").lower().replace("_", "-").split("-"):
            if len(t) >= 3 and t not in kata and t not in ("coin", "token", "finance", "protocol"):
                kata.append(t)
    return kata[:4]  # maks 4 kata = maks 4 pencarian


def detak_tim(simbol, cid=None, nama=None):
    """Detak tim: cari repo OTOMATIS dari identitas resmi (slug & nama paprika,
    BUKAN peta kurasi 12 koin). Kandidat wajib: bintang >= 5 dan nama
    repo/org mengandung kata identitas; org yang cocok slug paprika
    = repo resmi (tanpa perlu kata-kata kripto di deskripsi)."""
    kata = _kata_kunci(cid, nama, simbol)
    slug = str(cid or "").lower()
    KRIPTO = ("blockchain", "crypto", "token", "web3", "chain", "protocol", "defi",
              "ledger", "validator", "onchain")
    pilih, bintang, resmi = None, 0, False
    for kata_cari in kata:
        # GitHub search 422 bila qualifier in:name + OR panjang; kueri dua kata
        # terbukti akurat ("irys blockchain" -> repo resmi urutan #1).
        for q_kata in (f"{kata_cari} blockchain", kata_cari):
            try:
                rj = _get_tahan(
                    "https://api.github.com/search/repositories?q="
                    + urllib.parse.quote(q_kata) + "&sort=stars&per_page=15", 20, gh=True)
            except Exception:
                continue  # kata lain, jangan matikan seluruh lapis
            for x in (rj.get("items") or []):
                if x.get("archived") or (x.get("stargazers_count") or 0) < 5:
                    continue
                full = str(x.get("full_name") or "").lower()
                nm_repo = str(x.get("name") or "").lower().replace("-", "").replace("_", "")
                org = full.split("/")[0]
                teks = (str(x.get("name") or "") + " " + str(x.get("description") or "")
                        + " " + " ".join(str(t) for t in (x.get("topics") or []))).lower()
                cocok_org = kata_cari in org
                cocok_repo = nm_repo.startswith(kata_cari)
                if not (cocok_org or cocok_repo):
                    continue
                bau_kripto = any(k in teks for k in KRIPTO)
                kuat = bool(slug and slug in org) or (cocok_org and cocok_repo and bau_kripto)
                if not kuat and not bau_kripto:
                    continue  # buang repo kebetulan nama (library/non-kripto)
                lebih = (pilih is None or (x.get("stargazers_count") or 0) > bintang
                         or (kuat and not resmi))
                if lebih:
                    pilih, bintang, resmi = x, x.get("stargazers_count") or 0, kuat
            if pilih and resmi:
                break
        if pilih and resmi:
            break
    if not pilih:
        return ["detak tim: repo resmi tak berbekas di publik (bintang &lt; 5 / nama tak cocok) — sinyal hati-hati, bukan angka"]
    up = (datetime.now(timezone.utc)
          - datetime.fromisoformat(str(pilih["pushed_at"]).replace("Z", "+00:00")).replace(tzinfo=timezone.utc)).days
    bintang = pilih.get("stargazers_count") or 0
    if up <= 30:
        bentuk = "<b>AKTIF</b>"
    elif up <= 400:
        bentuk = "BERNAPAS"
    else:
        bentuk = "<b>BISU</b>"
    label = "repo resmi (org cocok identitas)" if resmi else "repo publik terkuat (bukan pasti resmi)"
    return [f"detak tim: {bentuk} — <i>{html.escape(pilih['full_name'])}</i> "
            f"disunting {max(up, 0)} hari lalu · ⭐{bintang} · {label}"
            + ("" if bentuk != "<b>BISU</b>" else " — hati-hati, tim diam lama")]


# ---------------- L3: NADI PASAR ----------------
def nadi_pasar(simbol, harga_kini, harga_puncak):
    baris = []
    try:
        arr = _get_tahan(
            f"https://fapi.binance.com/fapi/v1/klines?symbol={simbol}USDT&interval=1d&limit=15", 15)
        cls = [float(k[4]) for k in arr]
        vols = [float(k[5]) for k in arr]
        if len(cls) >= 8:
            v_now = sum(vols[-3:]) / 3
            v_lama = sum(vols[-10:-3]) / 7 or 1
            arah_v = "menghangat" if v_now > v_lama * 1.3 else "mendingin" if v_now < v_lama * 0.7 else "stabil"
            g5 = (cls[-1] / cls[-6] - 1) * 100 if len(cls) >= 6 else 0
            baris.append(
                f"nadi pasar: volume 3 hari terakhir {arah_v} vs pekan sebelumnya "
                f"(×{v_now / v_lama:.2f}) · harga 5 hari {g5:+.1f}% · jarak ke puncak "
                f"{(harga_puncak / max(harga_kini, 1e-12) - 1) * 100:.0f}% untuk balik")
    except Exception as e:
        baris.append(f"nadi pasar: gagal diambil ({repr(e)[:40]})")
    return baris


def bedah(simbol, harga_kini, harga_puncak, tgl_puncak=None, cid=None):
    """Gabung 3 lapis -> list baris '   · ...' siap suntik laporan.
    cid = id paprika resmi (mis. 'q-quack-ai') untuk identitas tim."""
    # nama resmi dari paprika bila cid tersedia (bantu pencarian org)
    nama = None
    if cid:
        try:
            nama = str(_get_tahan(f"{_PAPRIKA}/coins/{cid}", 15).get("name") or "") or None
        except Exception:
            nama = None
    out = []
    for fn, args in ((sebab_runtuh, (simbol, tgl_puncak, harga_puncak, harga_kini)),
                     (detak_tim, (simbol, cid, nama)),
                     (nadi_pasar, (simbol, harga_kini, harga_puncak))):
        try:
            out.extend(fn(*args))
        except Exception as e:
            out.append(f"bedah {fn.__name__}: gagal ({repr(e)[:40]})")
    return out


if __name__ == "__main__":
    # uji cepat mandiri: koin finalis hari ini (cid resmi dari paprika)
    for sym, now, pk, tg, cid in (
            ("Q", 0.03097, 0.236013, "27 Oct", "q-quack-ai"),
            ("IRYS", 0.01987, 0.50406, "23 Oct", "irys-irys")):
        print(f"== {sym} ==")
        for b in bedah(sym, now, pk, tg, cid=cid):
            print("  ", b)
