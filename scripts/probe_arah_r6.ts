import { forgeKlExam } from '../src/lib/exam/kompleks-suite'
import { arahVonis } from '../src/lib/exam/arah-brain'
import { klVonis } from '../src/lib/exam/kompleks-brain'
import { KL_VISIBLE } from '../src/lib/exam/kompleks-forge'

const u = forgeKlExam(84, 'ar-segel22')
const vis = u.candles.slice(0, KL_VISIBLE)
const v = arahVonis(vis)
const kl = klVonis(vis)
const f = kl.fitur
const atr = Math.max(f.atr, 1e-9)
const last = vis[vis.length - 1]
console.log(`#84 kl-cont-absorb GILA truth=${u.truth} vonis=${v.vonis} kepastian=${v.kepastian} lapisan=${v.lapisan}`)
console.log(`kl: ${kl.aksi}/${kl.arah} [${kl.pelajaranAktif.join(',')}] trigger=${kl.triggerLevel?.toFixed(2)}`)
console.log(`pool: side=${kl.pool.side} swept=${kl.pool.swept} bars=${kl.pool.barsSince} depth=${kl.pool.depthAtr.toFixed(2)} reclaimed=${kl.pool.reclaimed} level=${kl.pool.level.toFixed(2)}`)
console.log(`fitur: mom50=${f.mom50Atr.toFixed(2)} mom30=${f.mom30Atr.toFixed(2)} mom12=${f.mom12Atr.toFixed(2)} dEma=${f.distEma21Atr.toFixed(2)} lastVolZ=${f.lastVolZ.toFixed(1)} posWin=${f.posInWindow60.toFixed(2)} rangeAtr=${f.rangeAtr.toFixed(2)} price=${f.price.toFixed(2)} entry60=${u.entry.toFixed(2)}`)
console.log(`lastBody=${((last.c - last.o) / atr).toFixed(2)}ATR | pump: ${kl.pd.pump}/${kl.pd.pumpArah} dump=${kl.pd.dump} korbanPump=${kl.pd.korbanPump} fallFromPuncak=${kl.pd.fallFromPuncakAtr.toFixed(2)}`)
console.log(`bukti: ${v.bukti.map((b) => `${b.id}:${b.vote[0]}${b.kekuatan.toFixed(1)}`).join(' ')}`)
console.log(`jejak6: ${vis.slice(-6).map((c) => `${c.c >= c.o ? '+' : '-'}${((c.c - c.o) / atr).toFixed(2)}`).join(' ')}`)
for (const a of v.alasan) console.log(`  - ${a}`)
