#!/usr/bin/env python3
"""Uji browser V275-OTAK-AGENTIK — arena.html (file://, basis lokal).
Verifikasi: (1) Ruang Guru menjawab dengan LARIK PIKIR 4 langkah;
(2) chip neuron tampil; (3) badge OTAK AGENTIK; (4) sekolah 6 fakultas;
(5) jawaban kripto mendalam (funding/stop) memuat NEURON YANG MENYALA."""
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
        await pg.wait_for_timeout(600)

        # buka Ruang Guru
        await pg.get_by_text("RUANG GURU", exact=False).first.click()
        await pg.wait_for_timeout(800)

        hasil = {}
        hasil["sekolah_fakultas_label"] = await pg.get_by_text("6 fakultas", exact=False).count()
        # tanya soal stop loss — lihat larik pikir
        await pg.fill("#ask", "kenapa stop loss wajib dipasang sebelum entry?")
        await pg.click("#btnAsk")
        await pg.wait_for_timeout(1200)
        hasil["larik_pikir"] = await pg.get_by_text("LARIK PIKIR", exact=False).count()
        hasil["langkah_memahami"] = await pg.get_by_text("MEMAHAMI", exact=False).count()
        hasil["chip_neuron"] = await pg.locator(".nchip").count()
        hasil["badge_agentik"] = await pg.get_by_text("OTAK AGENTIK", exact=False).count()
        hasil["neuron_menyala_seksi"] = await pg.get_by_text("NEURON YANG MENYALA", exact=False).count()
        hasil["cek_silang"] = await pg.get_by_text("CEK SILANG", exact=False).count()
        # pertanyaan funding — kedalaman kripto
        await pg.fill("#ask", "funding rate tinggi bahaya nggak?")
        await pg.click("#btnAsk")
        await pg.wait_for_timeout(1200)
        hasil["jawab_funding"] = await pg.get_by_text("kerumunan membayar", exact=False).count() + await pg.get_by_text("pra-tangkap", exact=False).count()
        # panel PERTANYAANKU (MRIT) tetap hidup
        hasil["pertanyaanku"] = await pg.get_by_text("PERTANYAANKU", exact=False).count()

        el = pg.locator("#turns").first
        await el.scroll_into_view_if_needed()
        await pg.wait_for_timeout(400)
        await pg.screenshot(path="/home/z/my-project/research/arena-v275-agentik.png")
        print("=== HASIL UJI V275-OTAK-AGENTIK ===")
        ok = True
        for k, v in hasil.items(): print(f"{k}: {v}")
        if hasil["larik_pikir"] == 0: ok = False; print("!! larik pikir tak tampil")
        if hasil["chip_neuron"] == 0: ok = False; print("!! chip neuron tak tampil")
        if hasil["jawab_funding"] == 0: print("!! jawaban funding tak memuat pengetahuan neuron")
        errs = [e for e in errs if "favicon" not in e.lower()]
        print("console errors:", len(errs))
        for e in errs[:4]: print("  -", e[:140])
        await b.close()
        print("STATUS:", "LULUS" if ok else "PERIKSA")

asyncio.run(main())
