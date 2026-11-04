#!/usr/bin/env python3
# ============================================================
# WASIAT-ABADI v1.2 — pengawas para penjaga (lapis audit, di GitHub).
# Latar: insiden 1 Nov 2026 — sandbox tidur berjam-jam + disk rollback
# (#7/#8/#10) menghapus bukti. Audit harus tinggal di GitHub, kebal
# rollback sandbox. v1.1: bukti audit via contents API (jalur git commit
# di runner tidak reliable). v1.2: denyut sandbox = yang termuda dari
# (a) stamp SINKRON-WASIAT (bila cron jalan) dan (b) commit jembatan
# heartbeat (benteng/sasaran-zai.json, ~30 mnt) — deteksi tidur tetap
# hidup walau sinkron tidak berjalan.
# Tugas tiap run:
#  (1) ukur umur run terakhir tiap lapis abadi -> stall > batas:
#      bangunkan via dispatch + STALL=true (workflow recheck diri);
#  (2) denyut sandbox -> jurnal tidur/bangun permanen
#      di data/jurnal_sandbox.jsonl;
#  (3) tidur > 90 menit -> kabar jujur ke pemilik via Telegram
#      (sekali per episode);
#  (4) bukti audit: data/wasiat_ledger + data/wasiat_state.json.
# Tidak menyentuh skrip mahkota apa pun (balas_telegram/heartbeat).
# ============================================================
import base64
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

WIB = timezone(timedelta(hours=7))
API = "https://api.github.com/repos/" + os.environ["GITHUB_REPOSITORY"]
TOK = os.environ["GH_TOKEN"]
LAPIS = {"primer": ("benteng-balas.yml", 20), "wadah2": ("benteng-balas-2.yml", 45), "detak": ("benteng-telegram.yml", 20)}
BATAS_TIDUR_MENIT = 90
CHAT_FALLBACK = 8340502683


def req(method, url, payload=None, ctype="application/vnd.github+json"):
    data = None if payload is None else json.dumps(payload).encode()
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", "Bearer " + TOK)
    r.add_header("Accept", ctype)
    r.add_header("User-Agent", "wasiat-abadi")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            b = resp.read()
            return resp.status, (json.loads(b) if b and ctype.endswith("+json") else b)
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:
        return 0, None


def baca_repo(path):
    st, b = req("GET", f"{API}/contents/{path}", ctype="application/vnd.github.raw")
    return b.decode("utf-8", "replace") if st == 200 and isinstance(b, bytes) else None


def dorong_repo(path, isi_bytes, pesan):
    st, cur = req("GET", f"{API}/contents/{path}")
    sha = cur.get("sha") if st == 200 and isinstance(cur, dict) else None
    body = {"message": pesan + " [skip ci]", "content": base64.b64encode(isi_bytes).decode()}
    if sha:
        body["sha"] = sha
    st2, _ = req("PUT", f"{API}/contents/{path}", body)
    return st2 in (200, 201)


def baca_lokal(path):
    try:
        return json.load(open(path))
    except Exception:
        return None


def telegram(tok, chat, teks):
    body = {"chat_id": chat, "text": teks, "parse_mode": "HTML", "disable_web_page_preview": True}
    req("POST", "https://api.telegram.org/bot" + tok + "/sendMessage", body)


def utama():
    now = datetime.now(WIB)
    now_epoch = time.time()
    aksi, stall = [], False

    # (1) denyut para penjaga
    umur = {}
    for nama, (f, batas) in LAPIS.items():
        st, d = req("GET", f"{API}/actions/workflows/{f}/runs?per_page=1")
        m = None
        if st == 200 and d and d.get("workflow_runs"):
            t = datetime.strptime(d["workflow_runs"][0]["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            m = (datetime.now(timezone.utc) - t).total_seconds() / 60.0
        umur[nama] = m
        if m is None:
            aksi.append(f"{nama}: GAGAL-BACA")
        elif m > batas:
            stall = True
            st2, _ = req("POST", f"{API}/actions/workflows/{f}/dispatches", {"ref": "main"})
            aksi.append(f"{nama}: stall {m:.0f}mnt -> bangunkan (HTTP {st2})")

    # (2) denyut sandbox + jurnal
    stamp = baca_repo("data/stamp_sandbox.json")
    state = baca_repo("data/wasiat_state.json")
    try:
        state = json.loads(state) if isinstance(state, str) else (state or {"mode": "awake", "mulai": None, "alerted": False})
    except Exception:
        state = {"mode": "awake", "mulai": None, "alerted": False}
    sandbox_menit = None
    stamp_menit = None
    if stamp:
        try:
            stamp_menit = (now_epoch - json.loads(stamp)["epoch"]) / 60.0
        except Exception:
            stamp_menit = None
    st_j, dj = req("GET", f"{API}/commits?path=benteng/sasaran-zai.json&per_page=1")
    jembatan_menit = None
    if st_j == 200 and isinstance(dj, list) and dj:
        t = datetime.strptime(dj[0]["commit"]["committer"]["date"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        jembatan_menit = (datetime.now(timezone.utc) - t).total_seconds() / 60.0
    kandidat = [x for x in (stamp_menit, jembatan_menit) if x is not None]
    sandbox_menit = min(kandidat) if kandidat else None
    bangun = sandbox_menit is not None and sandbox_menit < 60

    jurnal_baru = []
    if bangun and state.get("mode") == "asleep":
        dur = (now_epoch - float(state.get("mulai") or now_epoch)) / 60.0
        jurnal_baru.append({"ts": now.isoformat(), "event": "sandbox_bangun", "durasi_menit": round(dur, 1)})
        aksi.append(f"sandbox bangun (tidur {dur:.0f}mnt) -> dijurnal")
        state = {"mode": "awake", "mulai": None, "alerted": False}
    elif (not bangun) and sandbox_menit is not None and state.get("mode") == "awake":
        state = {"mode": "asleep", "mulai": now_epoch, "alerted": False}
        jurnal_baru.append({"ts": now.isoformat(), "event": "sandbox_tidur", "umur_stamp_menit": round(sandbox_menit, 1)})
        aksi.append("sandbox tidur -> dijurnal")
    elif (not bangun) and sandbox_menit is not None:
        dur = (now_epoch - float(state.get("mulai") or now_epoch)) / 60.0
        if dur > BATAS_TIDUR_MENIT and not state.get("alerted"):
            nyawa = baca_lokal("benteng/nyawa.json") or {}
            tok, chat = nyawa.get("bot_token", ""), nyawa.get("chat_id", CHAT_FALLBACK)
            jam = dur / 60.0
            telegram(tok, chat,
                     f"🛡 <b>WASIAT-ABADI</b> — laporan jujur\n"
                     f"Tubuh sandbox tidur ~{jam:.1f} jam.\n"
                     f"Yang TETAP hidup: lapis abadi menjawab pesan & menjaga level 24 jam dari GitHub.\n"
                     f"Yang tertunda: otak analitik z.ai — menyusul otomatis saat tubuh bangun.")
            state["alerted"] = True
            aksi.append(f"tidur {dur:.0f}mnt -> kabar jujur ke pemilik")
        elif dur > BATAS_TIDUR_MENIT:
            aksi.append(f"tidur {dur:.0f}mnt (sudah dikabar)")

    # (3) bukti audit via contents API
    lama = baca_repo("data/wasiat_ledger") or ""
    baris = (f"{int(now_epoch)} {now.strftime('%F %T')}+07 "
             + " ".join(f"{k}={'?' if v is None else format(v, '.0f') + 'm'}" for k, v in umur.items())
             + f" sandbox={'?' if sandbox_menit is None else format(sandbox_menit, '.0f') + 'm'}"
             + f"(stamp={'?' if stamp_menit is None else format(stamp_menit, '.0f') + 'm'},jembatan={'?' if jembatan_menit is None else format(jembatan_menit, '.0f') + 'm'})"
             + f" mode={state.get('mode')}"
             + (" | " + "; ".join(aksi) if aksi else " | senyap") + "\n")
    ledger = (lama.splitlines()[-99:] + [baris.rstrip()])
    ok1 = dorong_repo("data/wasiat_ledger", "\n".join(ledger).encode() + b"\n", "wasiat: bukti audit")

    ok2 = dorong_repo("data/wasiat_state.json", json.dumps(state).encode(), "wasiat: state jurnal")
    ok3 = True
    if jurnal_baru:
        lama_j = baca_repo("data/jurnal_sandbox.jsonl") or ""
        isi = lama_j.rstrip("\n") + "\n" + "\n".join(json.dumps(j, ensure_ascii=False) for j in jurnal_baru) + "\n"
        ok3 = dorong_repo("data/jurnal_sandbox.jsonl", isi.encode(), "wasiat: jurnal sandbox")

    if stall:
        try:
            with open(os.environ["GITHUB_ENV"], "a") as f:
                f.write("STALL=true\n")
        except Exception:
            pass

    print("WASIAT:", " | ".join(aksi) if aksi else "senyap — semua lapis segar",
          "| sandbox", "?" if sandbox_menit is None else f"{sandbox_menit:.0f}m",
          f"mode={state.get('mode')}", f"| dorong ledger={ok1} state={ok2} jurnal={ok3}")
    return 0 if (ok1 and ok2 and ok3) else 1


if __name__ == "__main__":
    raise SystemExit(utama())
