// Verifikasi langsung #23 dengan T1VFP aktif
import { forgeFboSuite } from '../src/lib/exam/fbo-suite'
import { FBO_VISIBLE } from '../src/lib/exam/fbo-forge'
import { fbVonis, setFboR43Fixes } from '../src/lib/exam/fbo-brain'

setFboR43Fixes('T1VFP')
const suite = forgeFboSuite('fbo2200')
const ex = suite.find((x) => x.num === 23)!
const cs = ex.candles.slice(0, FBO_VISIBLE)
const k = fbVonis(cs, '1.37')
console.log('aksi:', k.aksi, k.arah, '| via:', k.pelajaranAktif.join('+'))
console.log('alasan:', k.alasan.join(' || '))
console.log('konfirmasi:', k.konfirmasi)
