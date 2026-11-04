// DIAGNOSTIK: distribusi hasil simulasi dengan beberapa param tetap
import fs from 'node:fs'
import path from 'node:path'
import { type JaCandle, type JaEpisodeMeta, fiturDari, kunciDaun, rezimDari, simJaTrade } from '../src/lib/exam/ja-inti'

const ROOT = '/home/z/my-project'

function muat(frame: string): JaEpisodeMeta[] {
  const p = path.join(ROOT, 'data', 'jual-ambisius', `episode-index-${frame}.jsonl`)
  if (!fs.existsSync(p)) return []
  return fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
}

function candles(frame: string, simbol: string): JaCandle[] {
  const dir = path.join(ROOT, 'data', 'ja-cache', frame === '4h' ? 'klines-4h' : 'klines', simbol)
  if (!fs.existsSync(dir)) return []
  const out: JaCandle[] = []
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    for (const b of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as unknown[][]) {
      out.push({ t: Number(b[0]), o: Number(b[1]), h: Number(b[2]), l: Number(b[3]), c: Number(b[4]), v: Number(b[5]) })
    }
  }
  return out
}

async function utama() {
  const eps = [...muat('1h'), ...muat('4h')]
  console.log('soal:', eps.length)
  // contoh 3000 soal merata
  const langkah = Math.max(1, Math.floor(eps.length / 3000))
  const contoh = eps.filter((_, i) => i % langkah === 0)

  const PARAMS = [
    { nama: 'A area1.5 sl4.5 amb6', areaPct: 1.5, slPct: 4.5, ambisiusPct: 6 },
    { nama: 'B area1 sl5 amb8', areaPct: 1.0, slPct: 5, ambisiusPct: 8 },
    { nama: 'C area0.5 sl6 amb12', areaPct: 0.5, slPct: 6, ambisiusPct: 12 },
    { nama: 'D area2.5 sl5 amb5', areaPct: 2.5, slPct: 5, ambisiusPct: 5 },
  ]
  const cacheC = new Map<string, JaCandle[]>()
  for (const prm of PARAMS) {
    const dist: Record<string, number> = {}
    for (const e of contoh) {
      const fr = e.frame ?? '1h'
      let cs = cacheC.get(`${fr}|${e.simbol}`)
      if (!cs) {
        cs = candles(fr, e.simbol)
        if (cacheC.size < 40) cacheC.set(`${fr}|${e.simbol}`, cs)
      }
      if (cs.length < 120) continue
      const idx = cs.findIndex((c) => c.t === e.startTs)
      if (idx < 0 || idx + 59 >= cs.length) continue
      const jendela = cs.slice(idx, idx + 60)
      const horizon = cs.slice(idx + 60, idx + 60 + (fr === '4h' ? 24 : 48))
      const led = simJaTrade(
        jendela[59].c,
        horizon,
        { aktif: true, areaPct: prm.areaPct, slPct: prm.slPct, ambisiusPct: prm.ambisiusPct },
        fr === '4h' ? { fillWindow: 6, sentuhMax: 6, longsorWindow: 6 } : undefined,
      )
      dist[led.hasil] = (dist[led.hasil] ?? 0) + 1
    }
    console.log(prm.nama, JSON.stringify(dist))
  }

  // contoh satu episode sukses penuh dengan param B → telusuri langkahnya
  let cerita = 0
  for (const e of contoh) {
    if (cerita >= 2) break
    const fr = e.frame ?? '1h'
    const cs = candles(fr, e.simbol)
    if (cs.length < 120) continue
    const idx = cs.findIndex((c) => c.t === e.startTs)
    if (idx < 0 || idx + 59 >= cs.length) continue
    const jendela = cs.slice(idx, idx + 60)
    const horizon = cs.slice(idx + 60, idx + 60 + (fr === '4h' ? 24 : 48))
    const led = simJaTrade(jendela[59].c, horizon, { aktif: true, areaPct: 1.0, slPct: 5, ambisiusPct: 8 }, fr === '4h' ? { fillWindow: 6, sentuhMax: 6, longsorWindow: 6 } : undefined)
    if (led.hasil === 'SUkses') {
      const f = fiturDari(jendela)
      const rez = rezimDari(f)
      console.log(`CONTOH SUKSES #${e.num} ${e.simbol} ${fr} ${rez} net=${led.netPct.toFixed(2)}% sentuh=${led.ambisiusTerisiJam}j longsor=${led.longsorJam}j`)
      cerita++
    }
  }
  if (cerita === 0) console.log('TIDAK ADA SUKSES pada contoh 3000 dengan param B — selidiki lebih dalam')
}
utama()
