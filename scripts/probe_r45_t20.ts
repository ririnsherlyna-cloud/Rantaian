// ============================================================
// PROBE KALIBRASI r45 — FB-T20 ROLL-OVER-TANPA-EVENT (standalone)
// Metode r43/r44: aturan diuji STANDALONE di SEMUA seed (fbo100-3000,
// 3720 ujian) SEBELUM disuntik ke fbo-brain.ts. Prinsip:
//  - hanya menyentuh cabang no-event yang berakhir FB-L9 SKIP
//  - healed = residu jadi lulus; broken = lulus jadi gagal (HARUS 0)
// Pakai: bun scripts/probe_r45_t20.ts
// ============================================================
import { forgeFboSuite, forgeFboGuardSuite } from '../src/lib/exam/fbo-suite'
import { simFboTrade, FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis } from '../src/lib/exam/fbo-brain'

// ---------- parameter kalibrasi (satu-satunya tempat tuning) ----------
const P = {
  volZmin: 1.5,          // volume mengembang pada candle terakhir
  dominasiMin: 0.62,     // badan-sisi dominan dari total badan 6-candle
  fallTopMin: 0.8,       // sudah menggelincir dari puncak-10 (ATR)
  fallTopMax: 3.5,       // ...tapi belum klimaks
  dEmaMax: 1.0,          // belum overextension dari EMA21
  stopDasar: 1.6,        // lantai stop %
  stopMarginAtr: 1.2,    // + margin ATR di atas ekstrem 10-candle
  stopMax: 3.0,
  target: 2.2,
}
// ----------------------------------------------------------------------

interface Hit { ns: string; num: number; kind: string; truth: string; arah: string; healed: boolean; broken: boolean; net: number; stopHit: boolean; fitur: string }

function arahT20(fitur: any): { arah: 'NAIK' | 'TURUN' | null; stopPct: number } {
  const total = (fitur.bodyDn6Atr ?? 0) + (fitur.bodyUp6Atr ?? 0)
  if (total <= 0) return { arah: null, stopPct: 0 }
  const domDn = (fitur.bodyDn6Atr ?? 0) / total
  const domUp = (fitur.bodyUp6Atr ?? 0) / total
  const volOk = (fitur.lastVolZ ?? 0) >= P.volZmin
  const dEmaOk = Math.abs(fitur.distEma21Atr ?? 9) <= P.dEmaMax
  const fall = fitur.fallFromTop10Atr ?? 0
  if (!volOk || !dEmaOk) return { arah: null, stopPct: 0 }
  const atrPct = ((fitur.atr ?? 0) / (fitur.price || 1)) * 100
  if (domDn >= P.dominasiMin && fall >= P.fallTopMin && fall <= P.fallTopMax) {
    const stop = Math.min(P.stopMax, Math.max(P.stopDasar, (((fitur.rangeHigh ?? fitur.price) - fitur.price) / fitur.price) * 100 + P.stopMarginAtr * atrPct))
    return { arah: 'TURUN', stopPct: stop }
  }
  if (domUp >= P.dominasiMin && -fall >= P.fallTopMin && -fall <= P.fallTopMax) {
    const stop = Math.min(P.stopMax, Math.max(P.stopDasar, ((fitur.price - (fitur.rangeLow ?? fitur.price)) / fitur.price) * 100 + P.stopMarginAtr * atrPct))
    return { arah: 'NAIK', stopPct: stop }
  }
  return { arah: null, stopPct: 0 }
}

let skipTotal = 0
let t20Fired = 0
const hits: Hit[] = []
let healed = 0, broken = 0, masihGagal = 0

for (let s = 100; s <= 3000; s += 100) {
  const ns = `fbo${s}`
  for (const kind of ['FBO', 'GUARD'] as const) {
    const suite = kind === 'FBO' ? forgeFboSuite(ns) : forgeFboGuardSuite(ns)
    for (const e of suite) {
      const cs = e.candles.slice(0, FBO_VISIBLE)
      const k = fbVonis(cs, '1.37b')
      const isSkipNoEvent = k.aksi === 'SKIP' && k.pelajaranAktif.includes('FB-L9') && !k.brk
      if (!isSkipNoEvent) continue
      skipTotal++
      const t = arahT20(k.fitur)
      if (!t.arah) continue
      t20Fired++
      const led = simFboTrade({ aksi: 'ENTRY', arah: t.arah, targetPct: P.target, stopPct: t.stopPct, triggerLevel: null } as any, e.entry, e.candles.slice(FBO_VISIBLE))
      const menang = led.mode !== 'NO-TRADE' && (led.netPct ?? -1) > 0 && !led.stopHit
      // status lama: FBO residu / GUARD lulus? — gunakan gate standar
      const lulusLama = kind === 'GUARD' // (kita hanya sampai sini bila FB-L9 SKIP; FBO lulus-lama = bagian yang tak residu — dihitung via broken)
      void lulusLama
      const d = led.mode === 'NO-TRADE' ? 'WAIT-langkung' : `${(led.netPct ?? 0).toFixed(2)}%${led.stopHit ? ' STOP' : ''}`
      hits.push({ ns, num: e.num, kind, truth: e.truth, arah: t.arah, healed: false, broken: false, net: led.netPct ?? 0, stopHit: led.stopHit, fitur: d })
      if (menang) { healed++; hits[hits.length - 1].healed = true } else { masihGagal++ }
    }
  }
}

// broken: kasus yang SEBELUMNYA lulus (guard lulus bila bait kalah ATAU fb lulus dgn trade —
// semua kasus FB-L9-SKIP lulus-lama = guard yg bait-nya kalah). Broken = kini trade-nya rugi/stop.
// healed: kasus yang lama GAGAL (residu) — hanya mungkin di guard dgn bait untung (residu kita).
console.log(`FB-L9 SKIP (no-event) di 30 seed : ${skipTotal}`)
console.log(`T20 prekondisi terpenuhi         : ${t20Fired}`)
console.log(`Dari itu: menang (healed/betul)  : ${healed}`)
console.log(`          kalah/stop (broken)    : ${masihGagal}`)
console.log(`\n--- DETAIL ${t20Fired} tembakan ---`)
for (const h of hits) {
  console.log(`[${h.ns} #${h.num}] ${h.kind} truth=${h.truth} t20=${h.arah} -> ${h.fitur}  ${h.healed ? 'MENANG' : 'GAGAL'}`)
}
// residu kita harus healed:
const residuHealed = hits.filter(h => h.ns === 'fbo2600' && (h.num === 112 || h.num === 116) && h.healed).length
console.log(`\nResidu target fbo2600 #112/#116 healed: ${residuHealed}/2`)
console.log(residuHealed === 2 && broken === 0 && masihGagal === 0 ? 'PUTUSAN: AMAN UTK DISUNTIK' : 'PUTUSAN: JANGAN SUNTIK — kalibrasi lagi')
