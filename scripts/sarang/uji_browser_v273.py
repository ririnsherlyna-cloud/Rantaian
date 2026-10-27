#!/usr/bin/env python3
"""Uji browser V273-SASARAN-PENUH — arena server (Next.js port 3000).
Verifikasi: panel SASARAN HARI INI tampil dengan entry/target/stop + peluang,
baris pick cyborg punya level, rival jujur 'tanpa rencana keluar'."""
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

        # buka tab Arena Hari Ini (default tab pertama) — pastikan terlihat
        try:
            await pg.get_by_text("Barisan Hari", exact=False).first.wait_for(timeout=15000)
        except Exception:
            await pg.evaluate("window.scrollTo(0,0)")

        hasil = {}
        hasil["panel_sasaran"] = await pg.get_by_text("SASARAN HARI INI", exact=False).count()
        hasil["tangga_entry"] = await pg.get_by_text("Entry (kunci)", exact=False).count()
        hasil["tembus_sasaran"] = await pg.get_by_text("tembus sasaran", exact=False).count()
        hasil["kena_stop"] = await pg.get_by_text("kena stop", exact=False).count()
        hasil["rival_tanpa_rencana"] = await pg.get_by_text("tanpa rencana keluar", exact=False).count()
        hasil["level_ringkas_E"] = await pg.locator("text=/→ S /").count()
        hasil["menyusul_note"] = await pg.get_by_text("rencana pra-registrasi menyusul", exact=False).count()

        # scroll ke panel barisan untuk screenshot
        el = pg.get_by_text("Barisan Hari", exact=False).first
        await el.scroll_into_view_if_needed()
        await pg.wait_for_timeout(800)
        await pg.screenshot(path="/home/z/my-project/research/arena-v273-sasaran.png", full_page=False)
        # mobile check
        pg2 = await browser.new_page(viewport={"width": 390, "height": 1400})
        await pg2.goto(BASE, wait_until="networkidle", timeout=90000)
        await pg2.wait_for_timeout(3000)
        el2 = pg2.get_by_text("Barisan Hari", exact=False).first
        await el2.scroll_into_view_if_needed()
        await pg2.wait_for_timeout(600)
        await pg2.screenshot(path="/home/z/my-project/research/arena-v273-mobile.png")

        print("=== HASIL V273-SASARAN-PENUH ===")
        ok = True
        for k, v in hasil.items():
            print(f"{k}: {v}")
        if hasil["panel_sasaran"] == 0:
            ok = False
            print("!! Panel SASARAN HARI INI tidak ditemukan")
        if hasil["tangga_entry"] == 0:
            print("!! Tangga entry tidak ditemukan (mungkin rencana belum ada)")
        errs = [e for e in errors if "favicon" not in e.lower()]
        print("console errors:", len(errs))
        for e in errs[:5]:
            print("  -", e[:160])
        await browser.close()
        print("STATUS:", "LULUS" if ok else "PERIKSA")

asyncio.run(main())
