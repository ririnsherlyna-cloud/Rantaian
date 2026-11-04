#!/usr/bin/env python3
"""Uji browser V279-KORTEX-KESADARAN — mandat pemilik "ciptakan formula sendiri;
kuasai paham AGI dan kesadaran matang; dengan data yang ada mampu meninjau
makin terasa".

Bagian A: arena.html Pages (file://, snapshot suntik /tmp/ak.json + kortex
  disuntik ke pick MICAPROFITA pertama) — badge v279, 55 soal, panel INDEKS
  KESADARAN (5 pilar + refleksi), chip KORTEX di Barisan, jawab kesadaran
  berangka IK.
Bagian B: server (http://localhost:3000) — UI server memuat + API hidup
  (evidence.kortex menyusul denyut LIVE_DECISION_VERSION baru).
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

ARENA = "/home/z/my-project/download/arena.html"
SERVER = "http://localhost:3000"

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

        # ============ BAGIAN A — arena.html Pages file:// ============
        # suntik kortex ke pick MICAPROFITA pertama agar chip bisa diuji deterministik
        try:
            snap = json.load(open("/tmp/ak.json"))
            for p in (snap.get("todayPicks") or []):
                if p.get("competitor") == "MICAPROFITA":
                    ev = p.get("evidence") or {}
                    ev["kortex"] = {"C": 0.61, "O": 0.67, "R": 0.5, "T": 1.0, "E": 0.68, "X": 0.85,
                                    "skor": 67, "rumus": "KORTEX = 100×(0.32·C + 0.22·O + 0.16·R + 0.14·T + 0.09·E + 0.07·X) — formula karangan-sendiri MICAPROFITA"}
                    break
        except Exception as e:
            print("  (snapshot tak tersedia:", e, ")"); snap = None

        pg = await br.new_page(viewport={"width": 1280, "height": 2400})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"file://{ARENA}", wait_until="domcontentloaded")
        if snap:
            await pg.evaluate("""(snap) => { try { window.__SNAP_SUNTIK__ = snap; if (typeof terima === 'function') terima(snap, 'UJI'); } catch (e) { window.__SUNTIK_ERR__ = String(e); } }""", snap)
        await pg.wait_for_timeout(4500)  # tunggu kelas kilat pertama + render

        badge = await pg.evaluate("() => document.body.innerHTML.includes('OTAK AGENTIK · v279 ·')")
        uji("A1 badge OTAK AGENTIK v279", badge)
        n_soal = await pg.evaluate("() => (typeof MICABRAIN !== 'undefined') ? MICABRAIN.KURIKULUM.length : 0")
        uji("A2 kurikulum 55 soal", n_soal == 55, "n=" + str(n_soal))
        teks55 = await pg.evaluate("() => document.body.innerHTML.includes('55 soal · 7 fakultas · 4 tingkat')")
        uji("A3 teks statis 55 soal ×2", teks55)
        ik_total = await pg.evaluate("() => { const e = document.getElementById('ikTotal'); return e ? e.textContent : ''; }")
        uji("A4 panel IK: total berangka", bool(ik_total.strip()) and "IK" in ik_total and "/100" in ik_total, ik_total)
        pilar_n = await pg.evaluate("() => { const e = document.getElementById('ikPilar'); return e ? e.querySelectorAll('.fakrow').length : 0; }")
        uji("A5 panel IK: 5 pilar berbar", pilar_n == 5, "n=" + str(pilar_n))
        pilar_txt = await pg.evaluate("() => { const e = document.getElementById('ikPilar'); return e ? e.textContent : ''; }")
        uji("A6 pilar TAHU..KOREKSI lengkap", all(w in pilar_txt for w in ["TAHU", "JUJUR", "DISIPLIN", "PENGALAMAN", "KOREKSI"]), pilar_txt[:80])
        ref = await pg.evaluate("() => { const e = document.getElementById('ikRefleksi'); return e ? e.textContent : ''; }")
        uji("A7 refleksi harian naratif", "AKU MENINJAU DIRIKU" in ref and "tindakan 48 jam" in ref, ref[:60])
        kortex_chip = await pg.evaluate("() => document.body.innerHTML.includes('KORTEX 67')")
        uji("A8 chip KORTEX tampil di Barisan (evidence suntik)", kortex_chip)
        # jawab kesadaran → IK berangka + hukum
        await pg.evaluate("() => { try { tanya('hitung indeks kesadaranmu sekarang dengan formula karangan sendiri'); } catch (e) { window.__TANYA_ERR__ = String(e); } }")
        await pg.wait_for_timeout(900)
        jwb = await pg.evaluate("() => { const a = document.querySelectorAll('.ans'); return a.length ? a[0].textContent : ''; }")
        uji("A9 jawab kesadaran membawa pilar IK", "TAHU" in jwb and "KOREKSI" in jwb and "IK" in jwb, jwb[:90])
        uji("A10 hukum IK ≠ keyakinan dijawab", "TIDAK boleh menaikkan keyakinan" in jwb)
        err_real = [e for e in errs if "net::ERR" not in e and "Failed to fetch" not in e]
        uji("A11 console error 0 (non-fetch)", len(err_real) == 0, err_real[:3])

        # ============ BAGIAN B — server hidup ============
        pg2 = await br.new_page(viewport={"width": 1280, "height": 1600})
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        try:
            r = await pg2.goto(SERVER, wait_until="domcontentloaded", timeout=30000)
            uji("B1 server halaman terbuka", r is not None and r.status == 200)
            body = await pg2.evaluate("() => document.body.textContent.slice(0, 400)")
            uji("B2 server body tak kosong", len(body.strip()) > 50)
        except Exception as e:
            uji("B1 server halaman terbuka", False, str(e)[:120])
        err_real2 = [e for e in errs2 if "net::ERR" not in e and "Failed to fetch" not in e]
        uji("B3 console error server 0", len(err_real2) == 0, err_real2[:3])

        await br.close()

    print(f"\n=== HASIL: {L}/{T} LULUS ===")
    sys.exit(0 if L == T else 1)

asyncio.run(main())
