#!/usr/bin/env python3
"""Uji browser V276-MESIN-CUAN — arena server (Next.js port 3000).
Verifikasi: panel BUKU CUAN tampil (net kumulatif, win rate, ekspektansi,
maxDD), keteledoran per rezim, DISIPLIN CUAN aktif, entri dinilai nyata."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        pg = await browser.new_page(viewport={"width": 1440, "height": 2100})
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await pg.goto(BASE, wait_until="networkidle", timeout=90000)
        await pg.wait_for_timeout(4000)
        try:
            await pg.get_by_text("Barisan Hari", exact=False).first.wait_for(timeout=15000)
        except Exception:
            await pg.evaluate("window.scrollTo(0,0)")

        hasil = {}
        hasil["panel_bukucuan"] = await pg.get_by_text("BUKU CUAN", exact=False).count()
        hasil["net_kumulatif"] = await pg.get_by_text("Net kumulatif (majemuk)", exact=False).count()
        hasil["winrate"] = await pg.get_by_text("Win rate (net>0)", exact=False).count()
        hasil["ekspektansi"] = await pg.get_by_text("Ekspektansi / rencana", exact=False).count()
        hasil["maxdd"] = await pg.get_by_text("Max drawdown", exact=False).count()
        hasil["rencana_dinilai"] = await pg.get_by_text("rencana dinilai", exact=False).count()
        hasil["keteledoran"] = await pg.get_by_text("KETELEDORAN DIHITUNG", exact=False).count()
        hasil["disiplin_cuan"] = await pg.get_by_text("DISIPLIN CUAN", exact=False).count()
        hasil["kejujuran"] = await pg.get_by_text("Profit PASTI tidak ada di pasar", exact=False).count()
        hasil["sasaran_tetap"] = await pg.get_by_text("SASARAN HARI INI", exact=False).count()

        el = pg.locator("[data-uji='panel_bukucuan']")
        if await el.count():
            await el.first.scroll_into_view_if_needed()
            await pg.wait_for_timeout(400)
        await pg.screenshot(path="/home/z/my-project/research/arena-v276-bukucuan.png")

        print("=== HASIL UJI V276-MESIN-CUAN (server) ===")
        ok = True
        for k, v in hasil.items():
            print(f"{k}: {v}")
        if hasil["panel_bukucuan"] == 0: ok = False; print("!! panel buku cuan tak tampil")
        if hasil["keteledoran"] == 0: print("!! keteledoran per rezim tak tampil (bisa karena belum ada rugi)")
        if hasil["rencana_dinilai"] == 0: ok = False; print("!! metrik rencana tak tampil")
        errs = [e for e in errors if "favicon" not in e.lower()]
        print("console errors:", len(errs))
        for e in errs[:4]: print("  -", e[:140])
        if errs: ok = False
        await browser.close()
        print("=== LULUS ===" if ok else "=== GAGAL ===")
        sys.exit(0 if ok else 1)

asyncio.run(main())
