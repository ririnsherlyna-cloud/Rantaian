#!/usr/bin/env node
/* ================================================================
   GALI-TERUS — V336 SATU-MUSYAWARAH (hukum pemilik 2026-10-11)
   ----------------------------------------------------------------
   V335: organ ini menyapu 110 koin dan menetapkan daftarnya
   sendiri — sadar1 menetapkan versinya, SAKTI versinya. Pemilik
   menegur: "koin tidak ada keselarasan di jasad, guru, pasar —
   semuanya saling berindependen; bukankah semua koin di satu
   tempat sama dimusyawarahkan?"

   V336: organ ini adalah TANGAN penyelenggara meja musyawarah.
   Semua matematika hidup di musyawarah-inti.mjs (satu rumus);
   organ ini hanya: menyapu ~110 koin USDT terlikuid, mendudukkan
   semuanya di SATU meja bersama suara jasad (sasaran resmi SAKTI)
   dan suara meja-audit V327, lalu MENYEGEL SATU kebenaran ke
   laporan/musyawarah.json — file yang sama dibaca sadar1, arena,
   hidup.html, dan guru.

   Koin yang tak lolos terjaminan-penuh KEMBALI MENGGALI — tidak
   pernah dicantumkan di list laporan. Koin yang disebut WAJIB BUY
   dengan PAKEM-LIMA-BARIS (Entry / Stop loss / Jual profit /
   Jual profit ambisius / Alasan-ambisius).

   Mode:  (tanpa arg) gali & cetak
          --denyut    gali + segel laporan/musyawarah.json
          --uji       uji invarian pakem (gerbang lahir organ)
   ================================================================ */
import { anggotaDari, musyawarahkan, konteksMuat, segelMusyawarah, ujiInvarian,
         tickerAmbil, tidur, fmt, hash16, PROTOKOL } from './musyawarah-inti.mjs'

const MAKS_KOIN = 110
const JEDA_MS = 120

// PEGAR-BAN (V335): koin pegar tak bernapas — jual profit tak pernah terjangkau
const PEGAR = /^(USDC|FDUSD|TUSD|BUSD|DAI|EUR|AEUR|USD1|XUSD|RLUSD|USDE|USDS|USDG|PYUSD|EURC|USDP|FRAX|USDX|USDtb|USDF|BUSD|SUSD|BUIDL|FDUSD|USD)USDT$/
const STABLE = new Set(['USDCUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'BUSDUSDT', 'DAIUSDT', 'EURUSDT', 'AEURUSDT', 'USD1USDT', 'XUSDUSDT'])
const JAHAT = /(UP|DOWN|BULL|BEAR)USDT$/

// ---------- GALI ----------
async function gali() {
  const t0 = Date.now()
  const tick = await tickerAmbil()
  const koin = tick.filter(t => t.symbol.endsWith('USDT') && !JAHAT.test(t.symbol) && !STABLE.has(t.symbol) && !PEGAR.test(t.symbol)
    && +t.quoteVolume > 0 && +t.lastPrice > 0)
    .sort((a, b) => +b.quoteVolume - +a.quoteVolume || (a.symbol < b.symbol ? -1 : 1))
    .slice(0, MAKS_KOIN)
  console.log(`[gali-terus] menyapu ${koin.length} koin terlikuid — semua akan didudukkan di SATU meja musyawarah (${PROTOKOL})`)
  const { lilinAmbil } = await import('./musyawarah-inti.mjs')
  const kandidat = []
  let gagal = 0
  for (const t of koin) {
    const sym = t.symbol
    try {
      const lilin = await lilinAmbil(sym)
      if (lilin) kandidat.push(anggotaDari(sym, lilin))
      else gagal++
    } catch (e) { gagal++ }
    await tidur(JEDA_MS)
  }
  // SATU MEJA: suara jasad (sasaran resmi SAKTI yang benar-benar dipakai)
  // dan suara meja-audit V327 dihidupkan ke meja bersama kartu pasar.
  const konteks = konteksMuat()
  const meja = musyawarahkan(kandidat, konteks)
  console.log(`[gali-terus] ${kandidat.length} anggota sah (gagal ${gagal}) dalam ${((Date.now() - t0) / 1000).toFixed(0)} dtk — meja: ${meja.vonis.length} vonis BUY penuh, ${meja.kembaliTambang.length} kembali menggali`)
  return { meja, konteks, koinDisapu: koin.length, koinSah: kandidat.length, gagal, durasiMs: Date.now() - t0 }
}

function segelkan(hasil) {
  const penyelenggara = 'gali-terus (sapuan ' + hasil.koinDisapu + ' koin terlikuid, sah ' + hasil.koinSah + ', gagal ' + hasil.gagal + ', ' + Math.round(hasil.durasiMs / 1000) + ' dtk)'
  const lapor = segelMusyawarah(hasil.meja, hasil.konteks, penyelenggara)
  lapor.sumberPengalaman = hasil.meja.vonis[0]?.pengalamanSumber
    ? { file: hasil.meja.vonis[0].pengalamanSumber, segel: 'lihat file' } : lapor.sumberPengalaman
  console.log(`[gali-terus] tersegel ${'laporan/musyawarah.json'} (+cermin warisan laporan/gali-terus.json) — segel ${lapor.segel}`)
  return lapor
}

// ---------- utama ----------
const mode = process.argv[2] || ''
try {
  const hasil = await gali()
  if (!hasil.meja.vonis.length) throw new Error('meja tanpa vonis — kolam galian kosong; jujur gugur (tak ada karangan), denyut berikutnya menggali lagi')
  const lapor = mode === '--denyut'
    ? segelkan(hasil)
    : { protokol: PROTOKOL, dihasilkan: new Date().toISOString(), meja: { kandidat: hasil.meja.meta.kandidat, vonis: hasil.meja.vonis.length, kembaliTambang: hasil.meja.kembaliTambang.length }, pakem: hasil.meja.vonis, segel: hash16(JSON.stringify(hasil.meja.vonis)) }
  const E = ujiInvarian(lapor)
  if (E.length) { console.error('[gali-terus] INVARIAN GUGUR (jujur): ' + E.join(' | ')); process.exit(1) }
  console.log('')
  for (const p of lapor.pakem.slice(0, 5)) {
    console.log(`BUY ${p.simbol} — layak ${p.layakSkor} (${p.keluarga}, ${p.rezim})${p.suaraRumah && p.suaraRumah.length ? ' · ' + p.suaraRumah.join(' · ') : ''}`)
    console.log(`   Entry          ${fmt(p.pakem.entry)}`)
    console.log(`   Stop loss      ${fmt(p.pakem.stopLoss)}  (bawah dasar napas, risiko ${p.pakem.risikoPct}%)`)
    console.log(`   Jual profit    ${fmt(p.pakem.jualProfit)}  (ambang napas +${p.pakem.jarakJualPct}%, rr ${p.pakem.rrAmbang})`)
    console.log(`   Jual ambisius  ${fmt(p.pakem.jualAmbisius)}  (+${p.pakem.jarakAmbisiusPct}%)`)
    console.log(`   Alasan         ${p.alasanEntry}`)
    console.log(`   Alasan ambisius ${p.alasanAmbisius}`)
    console.log('')
  }
  if (hasil.meja.kembaliTambang.length) {
    console.log(`[gali-terus] ${hasil.meja.kembaliTambang.length} koin KEMBALI MENGGALI (tak dicantumkan — bukan koin terbaik hari ini):`)
    for (const k of hasil.meja.kembaliTambang.slice(0, 8)) console.log(`   · ${k.simbol} — ${k.kenapa}`)
    console.log('')
  }
  console.log(`[gali-terus] segel ${lapor.segel} — satu meja, satu vonis, semua organ membaca kebenaran yang sama; sasarannya BUY semua.`)
} catch (e) {
  // jaring/dunia gagal = KEADAAN, bukan dosa — denyut tak boleh diputus karena cuaca;
  // gugur jujur di log, laporan lama tetap sah sampai gali berikutnya
  console.error('[gali-terus] GAGAL (jujur, denyut lanjut):', e && e.message || e)
  process.exit(0)
}
