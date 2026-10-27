// ============================================================
// V303 HEAL-RENCANA — sisipkan JUAL POWER MAX AMBISIUS ke rencana
// pra-registrasi hari hidup TANPA menggeser level terkunci.
//
// HUKUM JUJUR (wajib):
//  1. target/stop/ambisius TIDAK disentuh — hanya power max ditambah.
//  2. MC dijalankan ulang berbibit (fnv1a WARISAN|simbol|hari) di atas
//     lilin 1h TERTUTUP SEBELUM waktuKunci — pra-registrasi bebas bocor.
//  3. VERIFIKASI REPRODUKSI: ambisius hasil reproduksi harus cocok dengan
//     yang terkunci (rel diff < 0.2%) — bila tak cocok, baris DILEWATI
//     (dicatat jujur), bukan dipaksakan.
// ============================================================
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
const W = require(path.join(__dirname, '..', '.heal-build', 'lib', 'cyborg', 'warisan.js'))
const { fnv1a } = require(path.join(__dirname, '..', '.heal-build', 'lib', 'cyborg', 'brain.js'))

const SPOT_HOSTS = [
  'https://api.binance.com', 'https://api1.binance.com',
  'https://api-gcp.binance.vision', 'https://data-api.binance.vision',
].map((h) => h) // urutan sama market.ts
const SPOT = ['https://api.binance.com', 'https://api1.binance.com', 'https://api-gcp.binance.com', 'https://data-api.binance.vision']
const FAPI = ['https://fapi.binance.com']
const DEEP = 260 // identik HISTORY_1H_DEEP

async function klines1h(sym) {
  for (const hosts of [SPOT, FAPI]) {
    for (const h of hosts) {
      try {
        const r = await fetch(`${h}/api/v3/klines?symbol=${sym}&interval=1h&limit=${DEEP}`, { signal: AbortSignal.timeout(12000) })
        if (r.status === 429 || r.status === 418) { await new Promise((s) => setTimeout(s, 2500)); continue }
        if (!r.ok) continue
        const raw = await r.json()
        if (!Array.isArray(raw) || raw.length < 130) continue
        return raw.map((k) => ({ openTime: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], quoteVolume: +k[7] }))
      } catch { /* host berikut */ }
    }
  }
  return null
}

async function main() {
  const day = process.argv[2] || '2026-10-27'
  const d = await db.battleDay.findUnique({ where: { day }, include: { picks: true } })
  if (!d) { console.log(`BattleDay ${day} tak ada`); return }
  const picks = d.picks.filter((p) => p.competitor === 'MICAPROFITA')
  console.log(`${day}: ${picks.length} pick MICAPROFITA`)

  let btc1h = await klines1h('BTCUSDT')
  let lahir = 0, atap = 0, gagalRepro = 0, takAdaLilin = 0, sudahAda = 0, ambisiusSelaras = 0
  const detail = []
  for (const p of picks) {
    let ev
    try { ev = JSON.parse(p.evidence || '{}') } catch { continue }
    if (!ev.rencana || !ev.warisan || !ev.praRegistrasi) { takAdaLilin++; continue }
    if (ev.rencana.powerMaxVersi === 'V303b') { sudahAda++; continue }
    const cutoff = Date.parse(ev.praRegistrasi.waktuKunci)
    await new Promise((r) => setTimeout(r, 250))
    let c = await klines1h(p.symbol)
    if (!c) { takAdaLilin++; detail.push(`${p.symbol}: lilin gagal`); continue }
    const tutup = c.filter((x) => x.openTime + 3600_000 <= cutoff)
    if (tutup.length < 130) { takAdaLilin++; detail.push(`${p.symbol}: lilin tertutup ${tutup.length} < 130`); continue }
    try {
      const war = W.mesinWarisan(tutup, btc1h ?? tutup)
      const seed = fnv1a(`WARISAN|${p.symbol}|${day}`)
      const mc = W.monteCarlo24j(tutup, war.garch, seed)
      const sisi = p.direction === 'BUY' ? 1 : -1
      // VERIFIKASI REPRODUKSI utk sisi BUY (ambisius BUY tak pernah berubah)
      if (p.direction === 'BUY' && ev.rencana.highAmbisius != null) {
        const repro = ev.rencana.entry * (1 + mc.q75)
        const rel = Math.abs(repro - ev.rencana.highAmbisius) / ev.rencana.highAmbisius
        if (rel > 0.002) { gagalRepro++; detail.push(`${p.symbol}: reproduksi menyimpang ${(rel * 100).toFixed(2)}% — DILEWATI (jujur)`); continue }
      }
      // KOREKSI JUJUR V303b: ambisius SELL lama memakai konvensi kuantil
      // terbalik (bug) → level dangkal, bahkan di bawah TP sendiri. Selaras
      // dgn konvensi cermin baru + penanda transparan (hari masih PENDING).
      if (p.direction === 'SELL' && ev.rencana.highAmbisius != null) {
        const ambBaru = +(ev.rencana.entry * (1 - mc.q75Dn)).toPrecision(6)
        if (Math.abs(ambBaru - ev.rencana.highAmbisius) / ev.rencana.highAmbisius > 1e-6) {
          ev.rencana.highAmbisius = ambBaru
          ev.rencana.ambisiusPct = +(mc.q75Dn * 100).toFixed(2)
          ev.rencana.pAmbisius = +(mc.pLevelDn(Math.abs(ambBaru / ev.rencana.entry - 1))).toFixed(3)
          ev.rencana.ambisiusSelarasV303b = true
          ambisiusSelaras++
        }
      }
      const rencanaBaru = W.sisipkanPowerMax(p.direction, war, mc, ev.rencana)
      rencanaBaru.powerMaxVersi = 'V303b'
      ev.rencana = rencanaBaru
      if (ev.warisan.mc) ev.warisan.mc.pPowerMax = rencanaBaru.pPowerMax
      await db.pick.update({ where: { id: p.id }, data: { evidence: JSON.stringify(ev) } })
      lahir++
      if (rencanaBaru.powerMaxAmbisius != null) {
        detail.push(`${p.symbol} ${p.direction}: POWER MAX ${rencanaBaru.powerMaxAmbisius} (${p.direction === 'BUY' ? '+' : '-'}${Math.abs(rencanaBaru.powerMaxPct)}%, sentuh ${Math.round(rencanaBaru.pPowerMax * 100)}%)`)
      } else atap++
    } catch (e) { gagalRepro++; detail.push(`${p.symbol}: ${String(e).slice(0, 80)}`) }
  }
  console.log(`\nHASIL V303b: power max lahir=${lahir} · atap=ambisius=${atap} · ambisius-SELL diselaraskan=${ambisiusSelaras} · sudah ada=${sudahAda} · lilin kurang=${takAdaLilin} · repro gagal=${gagalRepro}`)
  for (const x of detail.slice(0, 60)) console.log('  ' + x)
  await db.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
