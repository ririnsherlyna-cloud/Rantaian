#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pengirim pesan Telegram util. Pemakaian: python3 kirim_benteng.py <file-pesan.html>"""
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "/home/z/my-project"


def baca(p):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return None


def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            text = f.read().strip()
    else:
        text = sys.stdin.read().strip()
    token = baca(os.path.join(BASE, ".token-telegram"))
    chat = baca(os.path.join(BASE, "data", "telegram_chat_id"))
    if not token or not chat or not text:
        print("GAGAL: token/chat/pesan kosong")
        return 1
    payload = urllib.parse.urlencode({
        "chat_id": chat, "text": text, "parse_mode": "HTML",
        "disable_web_page_preview": "true"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage", data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            resp = json.loads(r.read().decode())
    except Exception as e:
        print("GAGAL:", repr(e))
        return 2
    if resp.get("ok"):
        print("OK message_id=", resp["result"]["message_id"])
        return 0
    print("GAGAL:", resp)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
