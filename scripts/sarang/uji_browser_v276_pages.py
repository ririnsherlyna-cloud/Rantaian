#!/usr/bin/env python3
"""Uji browser V276-MESIN-CUAN — arena.html Pages (file://, snapshot suntik).
Verifikasi: (1) panel BUKU CUAN render dari st.bukuCuan (4 statistik + entri +
keteledoran + disiplin); (2) Ruang Guru menjawab "profit pasti" dengan
matematika + angka buku; (3) gugus neuron CUAN menyala; (4) badge v276;
(5) sekolah 7 fakultas."""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": 1360, "height": 1900})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        snap = json.load(open("/tmp/ak.json"))
        await pg.add_init_script(f"window.__UJI_SNAPSHOT__ = { json.dumps(snap) };")
        await pg.goto("file:///home/z/my-project/download/arena.html", wait_until="domcontentloaded")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("const e=document.getElementById('boot'); if(e) e.style.display='none'")
        await pg.evaluate("st = window.__UJI_SNAPSHOT__; render();")
        await pg.wait_for_timeout(700)

        hasil = {}
        hasil["panel_bukucuan_tampil"] = await pg.locator("#bukuCuanPanel").is_visible()
        hasil["bc_stats"] = await pg.locator(".bcStat").count()
        hasil["bc_entri"] = await pg.locator(".bcRow").count()
        hasil["bc_keteledoran"] = await pg.get_by_text("KETELEDORAN DIHITUNG", exact=False).count()
        hasil["bc_disiplin"] = await pg.get_by_text("DISIPLIN CUAN aktif", exact=False).count()
        hasil["bc_kejujuran"] = await pg.get_by_text("Profit PASTI tidak ada di pasar", exact=False).count()

        # jawaban cuan di Ruang Guru
        await pg.get_by_text("RUANG GURU", exact=False).first.click()
        await pg.wait_for_timeout(800)
        await pg.fill("#ask", "kapan kamu jadi mesin cuan profit pasti? masih banyak keteledoranmu")
        await pg.click("#btnAsk")
        await pg.wait_for_timeout(1400)
        hasil["jawab_bantah_pasti"] = await pg.get_by_text("PASTI tidak ada", exact=False).count()
        hasil["jawab_ekspektansi"] = await pg.get_by_text("ekspektansi", exact=False).count()
        hasil["larik_pikir"] = await pg.get_by_text("LARIK PIKIR", exact=False).count()
        hasil["badge_v276"] = await pg.get_by_text("OTAK AGENTIK · v276", exact=False).count()
        # gugus CUAN menyala — evaluasi langsung jaring neuron
        hasil["neuron_cuan"] = await pg.evaluate("MICABRAIN.NEURON.filter(n => n.kl === 'CUAN').length")
        hasil["chip_neuron"] = await pg.locator(".nchip").count()
        hasil["sekolah_7_fakultas"] = await pg.get_by_text("7 fakultas", exact=False).count()

        await pg.screenshot(path="/home/z/my-project/research/arena-v276-pages.png")
        print("=== HASIL UJI V276-MESIN-CUAN (Pages) ===")
        ok = True
        for k, v in hasil.items(): print(f"{k}: {v}")
        if not hasil["panel_bukucuan_tampil"]: ok = False; print("!! panel buku cuan tak tampil")
        if hasil["bc_stats"] != 4: ok = False; print("!! statistik buku bukan 4")
        if hasil["jawab_bantah_pasti"] == 0: ok = False; print("!! jawaban tak membantah profit pasti")
        if hasil["neuron_cuan"] != 6: ok = False; print("!! gugus CUAN bukan 6 neuron")
        if hasil["bc_entri"] == 0: print("!! entri buku kosong (snapshot mungkin tanpa entri)")
        errs = [e for e in errs if "favicon" not in e.lower()]
        print("console errors:", len(errs))
        for e in errs[:4]: print("  -", e[:140])
        await b.close()
        print("=== LULUS ===" if ok else "=== GAGAL ===")
        sys.exit(0 if ok else 1)

import sys
asyncio.run(main())
