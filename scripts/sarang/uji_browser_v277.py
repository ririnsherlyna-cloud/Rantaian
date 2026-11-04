#!/usr/bin/env python3
"""Uji browser V277-JUAL-AMBISIUS — mandat pemilik "harga ambisiusnya juga wajib ada".
Bagian A: dasbor laporan (harness file://) — baris 'jual ambisius' WAJIB tampil:
  kartu dgn data → harga + P sentuh; kartu tanpa data → '—' + alasan jujur (anti-bisu).
Bagian B: arena.html Pages (file://, snapshot suntik) — rung 'JUAL AMBISIUS' tampil
  di Barisan (picklevel) DAN panel rencana NADIR.
"""
import asyncio, json, re
from playwright.async_api import async_playwright

DASBOR = "/home/z/my-project/micaprofita/laporan/index.html"
ARENA = "/home/z/my-project/download/arena.html"

def ekstrak():
    s = open(DASBOR, encoding="utf-8").read()
    fmt = re.search(r"const fmt = \(x\) =>[^\n]+;", s).group(0)
    i = s.index("// V277-JUAL-AMBISIUS")
    j = s.index("function isiDaya")
    tangga = s[i:j]
    return fmt + "\n" + tangga

HARNESS = """<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="sasaran" id="c1"><div class="tangga"></div></div>
<div class="sasaran" id="c2"><div class="tangga"></div></div>
<script>
__KODE__
const s1 = { simbol:'ENA', jalur:'PHOENIX', entry: 0.9, target: 1.0, stop: 0.81,
  highAmbisius: 1.08, ketAmbisius: 'ujung swing 7 hari, hormat cap rezim',
  warisan: { mc: { pAmbisius: 0.31, pTarget: 0.44, pStop: 0.09 } } };
const s2 = { simbol:'ADA', jalur:'PHOENIX', entry: 0.68, target: 0.72, stop: 0.62,
  highAmbisius: null };   // kasus lama: ambisius belum terukur
isiTangga(document.getElementById('c1'), s1);
isiTangga(document.getElementById('c2'), s2);
window.__SIAP__ = true;
</script></body></html>"""

async def main():
    kode = ekstrak()
    html = HARNESS.replace("__KODE__", kode)
    open("/tmp/uji_v277_dasbor.html", "w", encoding="utf-8").write(html)
    json.dump(json.load(open("/tmp/arena_sekarang.json")), open("/tmp/ak.json", "w"))

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        hasil = {}

        # ===== Bagian A: dasbor =====
        pg = await b.new_page(viewport={"width": 1100, "height": 900})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto("file:///tmp/uji_v277_dasbor.html", wait_until="domcontentloaded")
        await pg.wait_for_timeout(500)
        hasil["A_siap"] = await pg.evaluate("window.__SIAP__ === true")
        hasil["A_baris_amb_c1"] = await pg.locator("#c1 .trow.amb").count()
        hasil["A_label_amb_c1"] = await pg.get_by_text("jual ambisius", exact=False).count()
        hasil["A_harga_c1"] = (await pg.locator("#c1 .trow.amb .tp").inner_text()).strip()
        hasil["A_pct_c1"] = (await pg.locator("#c1 .trow.amb .tpct").inner_text()).strip()
        hasil["A_psentuh_c1"] = (await pg.locator("#c1 .trow.amb .tpr").inner_text()).strip()
        hasil["A_baris_amb_c2"] = await pg.locator("#c2 .trow.amb").count()
        hasil["A_harga_c2"] = (await pg.locator("#c2 .trow.amb .tp").inner_text()).strip()
        hasil["A_pct_c2"] = (await pg.locator("#c2 .trow.amb .tpct").inner_text()).strip()
        hasil["A_tooltip_c2"] = await pg.locator("#c2 .trow.amb").get_attribute("title")
        hasil["A_urutan_c1"] = await pg.evaluate("[...document.querySelectorAll('#c1 .tlbl')].map(x=>x.textContent.trim().split(' ')[0]).join('>')")
        hasil["A_urutan_c2"] = await pg.evaluate("[...document.querySelectorAll('#c2 .tlbl')].map(x=>x.textContent.trim().split(' ')[0]).join('>')")
        await pg.screenshot(path="/home/z/my-project/research/dasbor-v277-ambisius.png")
        await pg.close()

        # ===== Bagian B: arena Pages =====
        pg2 = await b.new_page(viewport={"width": 1360, "height": 1900})
        errs2 = []
        pg2.on("console", lambda m: errs2.append(m.text) if m.type == "error" else None)
        snap = json.load(open("/tmp/ak.json"))
        await pg2.add_init_script(f"window.__UJI_SNAPSHOT__ = { json.dumps(snap) };")
        await pg2.goto(f"file://{ARENA}", wait_until="domcontentloaded")
        await pg2.wait_for_timeout(2500)
        await pg2.evaluate("const e=document.getElementById('boot'); if(e) e.style.display='none'")
        await pg2.evaluate("st = window.__UJI_SNAPSHOT__; render();")
        await pg2.wait_for_timeout(700)
        hasil["B_jual_ambisius_barisan"] = await pg2.get_by_text("JUAL AMBISIUS", exact=False).count()
        hasil["B_harga_amb"] = await pg2.get_by_text("0.269975", exact=False).count()
        hasil["B_sentuh_amb"] = await pg2.get_by_text("sentuh 36%", exact=False).count()
        hasil["B_renc_ambisius"] = await pg2.evaluate("[...document.querySelectorAll('#nadirPanel .renc')].filter(x=>x.textContent.includes('JUAL AMBISIUS')).length")
        await pg2.screenshot(path="/home/z/my-project/research/arena-v277-ambisius.png")
        await b.close()

        print("=== HASIL UJI V277-JUAL-AMBISIUS ===")
        ok = True
        for k, v in hasil.items():
            print(f"{k}: {v}")
        if not hasil["A_siap"]: ok = False; print("!! harness dasbor tak siap")
        if hasil["A_baris_amb_c1"] != 1: ok = False; print("!! baris ambisius kartu-1 hilang")
        if hasil["A_harga_c1"] != "1.08": ok = False; print("!! harga ambisius kartu-1 salah")
        if hasil["A_pct_c1"] != "+20.00%": ok = False; print("!! persen ambisius kartu-1 salah")
        if "31%" not in hasil["A_psentuh_c1"]: ok = False; print("!! P sentuh kartu-1 hilang")
        if hasil["A_baris_amb_c2"] != 1: ok = False; print("!! WAJIB GAGAL: kartu tanpa data kehilangan baris ambisius")
        if hasil["A_harga_c2"] != "—": ok = False; print("!! fallback '—' kartu-2 salah")
        if hasil["A_tooltip_c2"] != "perkiraan tertinggi belum terukur": ok = False; print("!! alasan jujur kartu-2 hilang")
        if hasil["A_urutan_c1"] != "jual>sasaran>entry>stop": ok = False; print(f"!! urutan c1 salah: {hasil['A_urutan_c1']}")
        if hasil["A_urutan_c2"] != "sasaran>entry>stop>jual": ok = False; print(f"!! urutan c2 salah: {hasil['A_urutan_c2']}")
        if hasil["B_jual_ambisius_barisan"] < 2: ok = False; print("!! Barisan/Pages kurang dari 2 rung JUAL AMBISIUS (barisan + renc)")
        if hasil["B_harga_amb"] < 1: ok = False; print("!! harga ambisius 0.269975 tak tampil")
        if hasil["B_sentuh_amb"] < 1: ok = False; print("!! peluang sentuh 36% tak tampil")
        if hasil["B_renc_ambisius"] < 1: ok = False; print("!! panel rencana NADIR tanpa JUAL AMBISIUS")
        errs = [e for e in errs if "favicon" not in e.lower()]
        print("console errors (dasbor):", len(errs), "| (arena):", len(errs2))
        for e in (errs + errs2)[:4]: print("  -", e[:140])
        print("=== LULUS ===" if ok else "=== GAGAL ===")

asyncio.run(main())
