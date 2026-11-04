#!/usr/bin/env python3
"""Uji LIVE V279 — halaman GitHub Pages produksi.
Badge v279 + panel INDEKS KESADARAN + chip KORTEX dari data live
(GTCUSDT 69 / SANDUSDT 36) + jawab kesadaran berangka."""
import asyncio, sys
from playwright.async_api import async_playwright

LIVE = "https://ririnsherlyna-cloud.github.io/Micaprofita-/arena.html"
L = 0
T = 0
def uji(nama, cond, detail=""):
    global L, T
    T += 1
    print(("  OK " if cond else "!! GAGAL ") + nama + ("" if cond else " — " + str(detail)))
    if cond: L += 1

async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        pg = await br.new_page(viewport={"width": 1280, "height": 2400})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(LIVE, wait_until="domcontentloaded", timeout=45000)
        await pg.wait_for_timeout(6000)

        uji("L1 badge OTAK AGENTIK v279", await pg.evaluate("() => document.body.innerHTML.includes('OTAK AGENTIK · v279 ·')"))
        uji("L2 kurikulum 55 soal live", await pg.evaluate("() => (typeof MICABRAIN !== 'undefined') && MICABRAIN.KURIKULUM.length === 55"))
        uji("L3 neuron 52 live", await pg.evaluate("() => MICABRAIN.NEURON.length === 52"))
        ik = await pg.evaluate("() => { const e = document.getElementById('ikTotal'); return e ? e.textContent : ''; }")
        uji("L4 panel IK total berangka", "IK" in ik and "/100" in ik, ik)
        pilar_n = await pg.evaluate("() => { const e = document.getElementById('ikPilar'); return e ? e.querySelectorAll('.fakrow').length : 0; }")
        uji("L5 panel IK 5 pilar", pilar_n == 5, pilar_n)
        ref = await pg.evaluate("() => { const e = document.getElementById('ikRefleksi'); return e ? e.textContent : ''; }")
        uji("L6 refleksi harian live", "AKU MENINJAU DIRIKU" in ref)
        chips = await pg.evaluate("() => (document.body.innerHTML.match(/KORTEX \\d+/g) || []).join(',')")
        uji("L7 chip KORTEX dari snapshot live (GTC 69 / SAND 36)", "KORTEX 69" in chips and "KORTEX 36" in chips, chips)
        # jawab kesadaran dari otak live
        await pg.evaluate("() => { try { tanya('sebutkan formula indeks kesadaranmu'); } catch (e) {} }")
        await pg.wait_for_timeout(1200)
        jwb = await pg.evaluate("() => { const a = document.querySelectorAll('.ans'); return a.length ? a[0].textContent : ''; }")
        uji("L8 jawab kesadaran: formula 5 pilar + hukum", "TAHU" in jwb and "KOREKSI" in jwb and "TIDAK boleh menaikkan keyakinan" in jwb)
        err_real = [e for e in errs if "net::ERR" not in e and "Failed to fetch" not in e]
        uji("L9 console error 0", len(err_real) == 0, err_real[:2])
        await pg.screenshot(path="/home/z/my-project/research/arena-v279-live.png", full_page=False)
        await br.close()
    print(f"\n=== HASIL LIVE: {L}/{T} LULUS ===")
    sys.exit(0 if L == T else 1)

asyncio.run(main())
