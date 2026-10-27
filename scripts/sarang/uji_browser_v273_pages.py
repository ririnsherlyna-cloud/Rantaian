#!/usr/bin/env python3
"""Uji browser V273 arena.html (file://, basis lokal) — verifikasi:
1) Barisan Hari memuat baris level (E -> T -> S) utk pick dgn rencana di pulse
2) badge 'cermin tertunda' muncul saat st.today != hari UTC
3) rival diberi catatan jujur 'tanpa rencana keluar'
Data: file arena.html memuat fallback snapshot; kalau fetch file:// gagal,
halaman tetap render dgn snapshot bawaan — kita uji DOM hasil render."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": 1360, "height": 1800})
        # suntikkan snapshot resmi ke global `st` SEBELUM skrip halaman jalan
        import json as _json
        snap = _json.load(open("/tmp/ak.json"))
        await pg.add_init_script(f"window.__UJI_SNAPSHOT__ = { _json.dumps(snap) };")
        await pg.goto("file:///home/z/my-project/download/arena.html", wait_until="domcontentloaded")
        await pg.wait_for_timeout(2500)
        # sembunyikan boot overlay bila ada
        await pg.evaluate("const e=document.getElementById('boot'); if(e) e.style.display='none'")
        # paksa keadaan + render (file:// tak bisa fetch — uji jalur render murni)
        await pg.evaluate("st = window.__UJI_SNAPSHOT__; render();")
        await pg.wait_for_timeout(800)
        hasil = {}
        hasil["pickwrap"] = await pg.locator(".pickwrap").count()
        hasil["picklevel"] = await pg.locator(".picklevel").count()
        hasil["cermin_tertunda"] = await pg.get_by_text("cermin tertunda").count()
        hasil["tanpa_rencana_keluar"] = await pg.get_by_text("tanpa rencana keluar").count()
        hasil["level_E_arrow"] = await pg.get_by_text("→ T ").count()
        # screenshot area barisan
        el = pg.locator("#duelGrid")
        if await el.count():
            await el.scroll_into_view_if_needed()
            await pg.wait_for_timeout(400)
        await pg.screenshot(path="/home/z/my-project/research/arena-pages-v273-barisan.png")
        print("=== HASIL UJI arena.html V273 ===")
        for k, v in hasil.items():
            print(f"{k}: {v}")
        await b.close()

asyncio.run(main())
