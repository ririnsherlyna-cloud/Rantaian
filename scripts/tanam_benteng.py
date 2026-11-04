#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tanam BENTENG ke repo abadi via GitHub Contents API + set secrets.
- scripts/benteng_telegram.py
- .github/workflows/benteng-telegram.yml
- secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (libsodium sealed box)
Token dibaca dari .token-rantaian; TIDAK dicetak utuh."""
import base64
import json
import os
import urllib.request

REPO = "ririnsherlyna-cloud/Micaprofita-"
API = f"https://api.github.com/repos/{REPO}"


def baca(p):
    with open(p, "r", encoding="utf-8") as f:
        return f.read().strip()


TOKEN = baca("/home/z/my-project/.token-rantaian")
H = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
     "User-Agent": "benteng-planter"}


def api(url, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=H, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def put_file(path, local, pesan):
    content = base64.b64encode(open(local, "rb").read()).decode()
    sha = None
    try:
        sha = api(f"{API}/contents/{path}")["sha"]
    except Exception:
        pass
    body = {"message": pesan, "content": content, "branch": "main"}
    if sha:
        body["sha"] = sha
    r = api(f"{API}/contents/{path}", "PUT", body)
    print(f"TANAM {path}: OK commit={r['commit']['sha'][:8]}")


def set_secret(nama, nilai):
    key = api(f"{API}/actions/secrets/public-key")
    from nacl import encoding, public
    pk = public.PublicKey(key["key"].encode("ascii"), encoding.Base64Encoder())
    sealed = public.SealedBox(pk).encrypt(nilai.encode("utf-8"))
    body = {"encrypted_value": base64.b64encode(sealed).decode(), "key_id": key["key_id"]}
    urllib.request.urlopen(urllib.request.Request(
        f"{API}/actions/secrets/{nama}", data=json.dumps(body).encode(),
        headers=H, method="PUT"), timeout=30)
    print(f"SECRET {nama}: OK")


put_file("scripts/benteng_telegram.py", "/home/z/my-project/rumah_induk/scripts/benteng_telegram.py",
         "BENTENG: penjaga level lapis abadi [skip ci]")
put_file(".github/workflows/benteng-telegram.yml", "/home/z/my-project/rumah_induk/benteng-telegram.yml.tmp",
         "BENTENG: workflow detak abadi Telegram [skip ci]")
set_secret("TELEGRAM_BOT_TOKEN", baca("/home/z/my-project/.token-telegram"))
set_secret("TELEGRAM_CHAT_ID", baca("/home/z/my-project/data/telegram_chat_id"))
print("SELESAI: berkas + secrets terpasang")
