#!/usr/bin/env python3
"""Uji browser V274-SLOT-JUJUR — arena server (Next.js port 3000).
Verifikasi: panel SASARAN menerbitkan laporan slot (K dirancang · lahir ·
ditolak guard), daftar kandidat ditolak dengan alasan, dan rencana tetap utuh."""
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
        hasil["panel_sasaran"] = await pg.get_by_text("SASARAN HARI INI", exact=False).count()
        hasil["laporan_slot"] = await pg.get_by_text("slot tempur dirancang", exact=False).count()
        hasil["tandai_sendirian"] = await pg.get_by_text("berdiri sendirian", exact=False).count()
        hasil["kandidat_ditolak"] = await pg.get_by_text("KANDIDAT YANG DITOLAK GUARD", exact=False).count()
        hasil["alasan_veto_sand"] = await pg.get_by_text("SAND", exact=False).count()
        hasil["silang_rival"] = await pg.get_by_text("rencana keluar hanya dimiliki cyborg", exact=False).count()
        hasil["tangga_entry"] = await pg.get_by_text("Entry (kunci)", exact=False).count()
        hasil["rival_tanpa_rencana"] = await pg.get_by_text("tanpa rencana keluar", exact=False).count()

        el = pg.get_by_text("Barisan Hari", exact=False).first
        await el.scroll_into_view_if_needed()
        await pg.wait_for_timeout(800)
        await pg.screenshot(path="/home/z/my-project/research/arena-v274-slot.png", full_page=False)

        print("=== HASIL V274-SLOT-JUJUR (server) ===")
        ok = True
        for k, v in hasil.items():
            print(f"{k}: {v}")
        if hasil["panel_sasaran"] == 0:
            ok = False; print("!! Panel SASARAN hilang")
        if hasil["laporan_slot"] == 0:
            ok = False; print("!! Laporan slot tidak tampil")
        if hasil["kandidat_ditolak"] == 0:
            print("!! Daftar ditolak tidak tampil (mungkin tidak ada penolakan)")
        errs = [e for e in errors if "favicon" not in e.lower()]
        print("console errors:", len(errs))
        for e in errs[:5]:
            print("  -", e[:160])
        await browser.close()
        print("STATUS:", "LULUS" if ok else "PERIKSA")

asyncio.run(main())
