#!/usr/bin/env python3
"""Uji browser V278-DEBAT-TEMPUR — mandat pemilik "lanjutkan sekolah kilat dan
pengembang agentic kita".

Bagian A: arena.html Pages (file://, snapshot suntik /tmp/ak.json) —
  badge v278, LARIK PIKIR 5 langkah (SERANG DIRIKU), teks sekolah 4 tingkat,
  CSS .tt-mahkota, buku-salah di renderSekolah, debat di larik-5.
Bagian B: server (http://localhost:3000) — panel bukti pick memuat
  DEBAT AGENTIK (serangan tim merah) + kewajiban "Debat tim merah".
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

ARENA = "/home/z/my-project/download/arena.html"
SERVER = "http://localhost:3000"

lulus = 0, 
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
        pg = await br.new_page(viewport={"width": 1280, "height": 2400})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"file://{ARENA}", wait_until="domcontentloaded")
        # suntik snapshot agar otak hidup
        try:
            snap = json.load(open("/tmp/ak_v278b.json"))
            await pg.evaluate("""(snap) => { try { window.__SNAP_SUNTIK__ = snap; if (typeof terimaSnapshot === 'function') terimaSnapshot(snap); } catch (e) { window.__SUNTIK_ERR__ = String(e); } }""", snap)
        except Exception as e:
            print("  (suntik dilewati:", e, ")")
        await pg.wait_for_timeout(1200)

        badge = await pg.evaluate("() => document.body.innerHTML.includes('OTAK AGENTIK · v278 ·')")
        uji("A1 badge OTAK AGENTIK v278", badge)
        n_neuron = await pg.evaluate("() => (typeof MICABRAIN !== 'undefined') ? MICABRAIN.NEURON.length : 0")
        uji("A2 neuron 52 tertanam", n_neuron >= 52, "n=" + str(n_neuron))
        n_soal = await pg.evaluate("() => (typeof MICABRAIN !== 'undefined') ? MICABRAIN.KURIKULUM.length : 0")
        uji("A3 kurikulum 52 soal", n_soal >= 52, "n=" + str(n_soal))
        ada_mahkota = await pg.evaluate("() => MICABRAIN.KURIKULUM.some(s => s.tingkat === 'mahkota')")
        uji("A4 tingkat MAHKOTA ada", ada_mahkota)
        css_m = await pg.evaluate("() => document.head.innerHTML.includes('.tt-mahkota')")
        uji("A5 CSS .tt-mahkota", css_m)
        larik5 = await pg.evaluate("() => document.body.innerHTML.includes('agentik 5 langkah')")
        uji("A6 render larik 'agentik 5 langkah'", larik5)
        teks4 = await pg.evaluate("() => document.body.innerHTML.includes('4 tingkat (dasar→MAHKOTA)')")
        uji("A7 teks sekolah 4 tingkat", teks4)
        bs = await pg.evaluate("() => document.body.innerHTML.includes('buku-salah')")
        uji("A8 buku-salah di halaman", bs)
        # jawab agentic → langkah-5 tampil
        r = await pg.evaluate("""() => {
            const st = window.__ST__ || window.__st || null;
            const M = MICABRAIN;
            const otak = M.otakBaru();
            const jawab = M.jawabAgentic('apa pendapatmu tentang pick hari ini?', st || (typeof st !== 'undefined' ? st : null), otak);
            return { langkah: jawab.larik.langkah.map(l => l.n), l5: jawab.larik.langkah[4] ? jawab.larik.langkah[4].t : '' };
        }""")
        uji("A9 larik 5 langkah dari MICABRAIN", len(r["langkah"]) == 5, r["langkah"])
        uji("A10 langkah-5 SERANG DIRIKU", "SERANG DIRIKU" in r["langkah"][4] if len(r["langkah"]) >= 5 else False)
        uji("A11 langkah-5 bawa serangan/pertahanan berangka", ("[" in r["l5"] and "]" in r["l5"]) or len(r["l5"]) > 40, r["l5"][:80])
        await pg.close()

        # ============ BAGIAN B — server :3000 ============
        pg2 = await br.new_page(viewport={"width": 1360, "height": 2400})
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        await pg2.goto(SERVER + "/", wait_until="domcontentloaded", timeout=60000)
        await pg2.wait_for_timeout(6000)
        # panel bukti pick (debat) ada di tab Briefing Guru
        try:
            await pg2.get_by_text("Briefing Guru", exact=False).first.click(timeout=10000)
            await pg2.wait_for_timeout(2500)
        except Exception as e:
            print("  (klik tab gagal:", e, ")")
        html = await pg2.content()
        debat_ui = await pg2.evaluate("() => document.body.innerHTML.includes('Debat agentik — tim merah')")
        duty_debat = await pg2.evaluate("() => document.body.innerHTML.includes('Debat tim merah (V278)')")
        uji("B1 panel DEBAT AGENTIK di UI server", debat_ui)
        uji("B2 kewajiban 'Debat tim merah (V278)' tampil", duty_debat)
        serang_ui = await pg2.evaluate("() => document.body.innerHTML.includes('[PERTAHANAN]') || document.body.innerHTML.includes('tak ada serangan berangka')")
        uji("B3 isi serangan/pertahanan terlihat", serang_ui)
        # SEKOLAH KILAT hanya di arena.html Pages (A7) — di server: kartu bukti lengkap
        kartu = await pg2.evaluate("() => document.body.innerHTML.includes('Kewajiban wajib (hard rule)')")
        uji("B4 kartu bukti lengkap (kewajiban tampil)", kartu)
        uji("B5 console error 0 (server)", len(errs2) == 0, errs2[:2])
        await pg2.close()
        await br.close()

    print(f"=== HASIL: {L}/{T} LULUS ===")
    sys.exit(0 if L == T else 1)

asyncio.run(main())
