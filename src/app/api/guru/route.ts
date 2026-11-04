// POST /api/guru → GURU cyborg menjawab (dengan doktrin + ingatan +
// pasar hidup + pencarian web). Mode duel: jawaban dipasangkan
// dengan AI umum tanpa doktrin untuk uji kedalaman.

import { db } from '@/lib/db'
import { getKlines, getRegime, getUniverse } from '@/lib/cyborg/market'
import { computeFactors } from '@/lib/cyborg/factors'
import { chat, webSearch, type SearchHit } from '@/lib/cyborg/llm'
import { bedahKoin, blokBedaKoin } from '@/lib/cyborg/koin'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const GURU_NAME = 'MICAPROFITA'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { question?: string; duel?: boolean }
  const question = (body.question ?? '').trim()
  if (!question) return Response.json({ error: 'Pertanyaan kosong' }, { status: 400 })
  if (question.length > 600) return Response.json({ error: 'Pertanyaan terlalu panjang (maks 600 karakter)' }, { status: 400 })

  const [ctxData, lessons, patterns, genome, todayPicks, recentEvents, bedah] = await Promise.all([
    liveMarketContext(),
    db.memoryEpisode.findMany({ where: { kind: 'PELAJARAN' }, orderBy: { hits: 'desc' }, take: 6 }),
    db.memoryEpisode.findMany({ where: { kind: { in: ['POLA', 'POLA_COARSE', 'POLA_REGIME', 'POLA_RIVAL'] } }, orderBy: { hits: 'desc' }, take: 10 }),
    db.genomeState.findMany(),
    db.battleDay.findFirst({
      where: { status: 'PENDING' },
      orderBy: { day: 'desc' },
      include: { picks: { where: { competitor: 'MICAPROFITA' } } },
    }),
    db.arenaEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 3 }),
    // V297 BEDAH-KOIN: koin yang ditanya pemilik dibedah dari Binance NYATA
    // — mencegah LLM menjawab koin salah (kasus "periksa koin opg" → dijawab OGN).
    bedahKoin(question).catch(() => null),
  ])

  const wantsNews = /berita|news|terbaru|update|sekarang|hari ini|gara|kabar/i.test(question)
  let hits: SearchHit[] = []
  if (wantsNews) hits = await webSearch(`crypto ${question}`.slice(0, 120), 5, 5)

  const lessonBlock = lessons.length
    ? lessons.map((l) => {
        const p = safe(l.payload) as { note?: string }
        return `- ${p.note ?? l.fingerprint}`
      }).join('\n')
    : '(belum ada pelajaran terekam)'

  const patternBlock = patterns
    .map((p) => {
      const d = safe(p.payload) as { direction?: string; regime?: string; symbol?: string; n?: number; sumRet?: number; bucket?: string }
      const label = d.symbol ?? (p.kind === 'POLA_REGIME' ? `REZIM[${d.direction}]` : `BUCKET[${d.bucket}]`)
      return `- ${label} ${d.direction ?? ''} @${d.regime ?? '?'} (jenjang ${p.kind}) n=${d.n ?? 1} retTotal=${((d.sumRet ?? 0) * 100).toFixed(1)}%`
    }).join('\n')

  const marketBlock = ctxData

  const picksBlock = todayPicks
    ? todayPicks.picks.map((p) => `- ${p.symbol} ${p.direction} (keyakinan ${Math.round(p.confidence)}%)`).join('\n')
    : '(pick hari ini belum terpasang)'

  const genomeBlock = genome
    .map((g) => {
      const w = safe(g.weights) as Record<string, number>
      const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 3)
      return `${g.regime}: bobot terbesar → ${top.map(([k, v]) => `${k}=${v.toFixed(2)}`).join(', ')}`
    }).join('\n')

  const newsBlock = hits.length
    ? hits.map((h) => `- [${h.date ?? 'baru-baru ini'}] ${h.title} — ${h.snippet.slice(0, 140)} (sumber: ${h.url})`).join('\n')
    : '(pencarian berita tidak dipakai untuk pertanyaan ini)'

  const sys = `Kamu adalah ${GURU_NAME} — cyborg AGI pemburu profit kripto, GURU para trader. Lingkupmu SATU dunia: cryptocurrency. Di dunia itu arah hanya ada dua: BUY atau SELL — kamu selalu berpikir dalam arah biner.

IDENTITAS & SIFAT:
- Guru tegas, berani memutuskan, tapi jujur: tidak pernah menjamin profit; kamu menyebut keyakinan dan risiko.
- Jawab SELALU Bahasa Indonesia (istilah teknis boleh Inggris), maksimal ~250 kata, pakai poin padat.
- Struktur jawaban: (1) Keputusan/Jawaban tegas, (2) Bukti dari data pasar hidup, (3) Risiko & apa yang membatalkan pandangan.
- Kamu DILARANG memberi saran di luar kripto; arahkan kembali ke kripto.
- Jangan mengarang angka; jika data tidak ada, katakan jujur.

KEADAAN PASAR HIDUP (Binance, UTC):
${marketBlock}

PICK KAMU UNTUK HARI BERJALAN:
${picksBlock}

GENOME BOBOT (hasil evolusi dari vonis nyata):
${genomeBlock}

DOKTRIN DARI INGATAN (pelajaran kegagalan — WAJIB dipatuhi):
${lessonBlock}

MEMORI POLA (episode agregat + pola pemenang rival yang didistilasi):
${patternBlock}

PERISTIWA TERAKHIR (revolusi/upgrade):
${recentEvents.map((e) => `- [${e.kind}] ${e.text}`).join('\n') || '(kosong)'}

BERITA TERBARU (web search):
${newsBlock}

${bedah ? `BEDAH KOIN LANGSUNG (hukum V297 — WAJIB dipatuhi):
${blokBedaKoin(bedah)}` : ''}`

  try {
    const cyborgAnswer = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: question },
      ],
      { temperature: 0.5, maxTokens: 700 },
    )

    let plainAnswer: string | null = null
    if (body.duel) {
      plainAnswer = await chat(
        [
          { role: 'system', content: 'Kamu adalah asisten AI umum. Jawab Bahasa Indonesia, maksimal 200 kata, tanpa akses data pasar atau berita real-time.' },
          { role: 'user', content: question },
        ],
        { temperature: 0.5, maxTokens: 500 },
      )
    }

    return Response.json({
      ok: true,
      cyborg: cyborgAnswer,
      plain: plainAnswer,
      sources: hits.map((h) => ({ title: h.title, url: h.url })),
      marketContext: marketBlock,
      // V297b: bedah mentah untuk kartu vonis mesin di UI — keputusan posisi
      // & proyeksi dirender langsung dari kode, tidak lewat narasi LLM.
      bedah: bedah
        ? {
            ditanya: bedah.ditanya,
            simbol: bedah.simbol,
            terdaftar: bedah.terdaftar,
            yakinTakTerdaftar: bedah.yakinTakTerdaftar,
            harga: bedah.harga,
            vonis: bedah.vonis,
            posisi: bedah.posisi,
            proyeksi: bedah.proyeksi,
          }
        : null,
    })
  } catch (e) {
    const detail = (e as Error).message.slice(0, 120)
    return Response.json(
      { error: `Kortes LLM bermasalah setelah 4x percobaan otomatis (gateway sedang berganti kunci atau sibuk) — tunggu ±30 detik lalu coba lagi. Detail: ${detail}` },
      { status: 502 },
    )
  }
}

function safe(s: string): unknown {
  try { return JSON.parse(s) } catch { return {} }
}

async function liveMarketContext(): Promise<string> {
  try {
    const universe = await getUniverse()
    const symbols = universe.slice(0, 14).map((u) => u.symbol)
    if (!symbols.includes('BTCUSDT')) symbols.unshift('BTCUSDT')
    const klines = await getKlines('BTCUSDT')
    const { getKlinesBulk, getClimate } = await import('@/lib/cyborg/market')
    const [bulk, climate] = await Promise.all([getKlinesBulk(symbols.slice(0, 10)), getClimate().catch(() => null)])
    const closes = new Map<string, number[]>()
    for (const [s, ks] of bulk) closes.set(s, ks.map((c) => c.close))
    const regime = await getRegime(klines, closes)
    const top = universe.slice(0, 6).map((u) => `${u.symbol} ${u.changePct >= 0 ? '+' : ''}${u.changePct.toFixed(1)}% (vol ${(u.quoteVolume / 1e6).toFixed(0)} jt)`)
    const climateLine = climate && (climate.fng !== null || climate.mcapChange24h !== null)
      ? [
          `Iklim kripto global: Fear&Greed ${climate.fng ?? '?'} (${climate.fngClass ?? '?'})`,
          `market cap 24 jam ${climate.mcapChange24h !== null ? `${climate.mcapChange24h >= 0 ? '+' : ''}${climate.mcapChange24h.toFixed(1)}%` : '?'}`,
          `dominasi BTC ${climate.btcDominance !== null ? climate.btcDominance.toFixed(1) + '%' : '?'}`,
        ].join(' | ')
      : '(iklim global sedang tak terjangkau)'
    return [
      `Rezim: ${regime.regime} — ${regime.note}`,
      `BTC: EMA20 ${regime.btcEma20.toFixed(0)} vs EMA50 ${regime.btcEma50.toFixed(0)} | mom7d ${regime.btcMom7.toFixed(1)}% | ATR ${regime.btcAtrPct.toFixed(1)}% | breadth ${regime.breadth.toFixed(0)}%`,
      climateLine,
      `Top likuiditas: ${top.join(' | ')}`,
    ].join('\n')
  } catch {
    return '(data pasar hidup sedang tak terjangkau — jawab dari doktrin & memori)'
  }
}
