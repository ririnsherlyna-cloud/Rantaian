// UJI V304-2 — replika persis logika klaimJujurData + periksaAktivasi
// (kode sama dgn telegram_jaga.mjs, diuji terisolasi tanpa kirim Telegram)
import { execFile } from 'child_process'

const ROOT = '/home/z/my-project'
const apiLokal = async (jalur, timeoutMs = 45000) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(`http://127.0.0.1:3000${jalur}`, { signal: c.signal })
    return await r.json()
  } finally { clearTimeout(t) }
}
const PY_GENOME = `
import sqlite3
c = sqlite3.connect('/home/z/my-project/db/custom.db')
r = c.execute("select day, generation, kind, note from GenomeLog where kind in ('MUTATION','KNOB') order by id desc limit 1").fetchone()
print(f"{r[0]}|gen{r[1]}|{r[2]}|{r[3][:90]}" if r else '-')
`
const mutasiGenome = () => new Promise((resolve) => {
  execFile('python3', ['-c', PY_GENOME], { timeout: 9000 }, (err, stdout) => {
    resolve(err ? null : String(stdout).trim() || null)
  })
})
const pct = (x) => (typeof x === 'number' && isFinite(x) ? `${x > 0 ? '+' : ''}${x.toFixed(2)}%` : '—')

// ── Uji klaimJujurData ──
const a = await apiLokal('/api/arena', 60000)
const mica = (a.standings || []).find((s) => s.competitor === 'MICAPROFITA')
const chart = (a.chart || []).map((c) => ({ hari: c.day, v: c.MICAPROFITA ?? 0 })).filter((c) => typeof c.v === 'number')
let puncak = { v: 0, hari: '' }
for (const c of chart) if (c.v > puncak.v) puncak = c
const kini = chart.length ? chart[chart.length - 1].v : null
const tujuh = chart.slice(-7)
const rata7 = tujuh.length ? tujuh.reduce((s, c, i) => s + (i ? c.v - tujuh[i - 1].v : 0), 0) / Math.max(1, tujuh.length - 1) : null
const mutasi = await mutasiGenome()

console.log('=== KLAIM JUJUR (data hidup) ===')
console.log(`kumulatif: ${pct(mica.cumRet)} (${mica.days} hari, ${mica.picks} pick)`)
console.log(`akurasi: ${Math.round(mica.hitRate * 100)}% · terbaik ${pct(mica.bestDay)} · terburuk ${pct(mica.worstDay)}`)
console.log(`puncak: ${pct(puncak.v / 100)} pada ${puncak.hari} → turun ${(puncak.v - kini).toFixed(1)} poin`)
console.log(`rata 7 hari: ${pct(rata7)}/hari · brier: ${a.brier?.nilai}`)
console.log(`genome: gen ${a.genome?.generation} · mutasi terakhir: ${mutasi}`)

// ── Uji regex routing ──
const uji = [
  ['periksa aktivasi', 'AKTIVASI'], ['aktivasi', 'AKTIVASI'], ['cek hidup', 'AKTIVASI'],
  ['denyut', 'DENYUT-STATUS'], ['denyut 15', 'DENYUT-SET'], ['denyut mati', 'DENYUT-MATI'], ['denyut nyala', 'DENYUT-NYALA'],
  ['klaim', 'KLAIM'], ['klaim jujur', 'KLAIM'],
  ['laporan', 'LAPORAN'], ['status', 'STATUS'], ['ping', 'PING'], ['koin pepe', 'KOIN'], ['halo', 'SAPA'],
  ['btc', 'FALLBACK-KOIN'],
]
console.log('\n=== ROUTING ===')
for (const [q, harap] of uji) {
  const s = q.toLowerCase()
  let hasil = 'FALLBACK-LAIN'
  if (s === 'ping') hasil = 'PING'
  else if (/^(periksa aktivasi|cek aktivasi|aktivasi|periksa hidup|cek hidup|masih hidup|masih on|hidup kah)/.test(s)) hasil = 'AKTIVASI'
  else if (/^denyut\s+(\d+)\s*$/.test(s)) hasil = 'DENYUT-SET'
  else if (/^denyut\s*(mati|off)/.test(s)) hasil = 'DENYUT-MATI'
  else if (/^denyut\s*(nyala|on)/.test(s)) hasil = 'DENYUT-NYALA'
  else if (/^denyut/.test(s)) hasil = 'DENYUT-STATUS'
  else if (/^klaim/.test(s)) hasil = 'KLAIM'
  else if (/^(laporan|laporan hari ini|daftar 50|daftar koin)/.test(s)) hasil = 'LAPORAN'
  else if (/^status/.test(s)) hasil = 'STATUS'
  else if (/^ujian/.test(s)) hasil = 'UJIAN'
  else if (/^koin\s+/.test(s)) hasil = 'KOIN'
  else if (/^(halo|hai|hi|assalamu|pagi|siang|malam)/.test(s)) hasil = 'SAPA'
  else if (/^(bantuan|help|menu|start|\/start)/.test(s)) hasil = 'BANTUAN'
  const ok = hasil === harap
  console.log(`${ok ? '✓' : '✗ GAGAL'} "${q}" → ${hasil}${ok ? '' : ' (harap ' + harap + ')'}`)
}
console.log('\nUJI SELESAI')
