'use client'

// ============================================================
// SHIM PANTULAN — jembatan data untuk wujud mandiri Rantaian di
// GitHub Pages (statis, tanpa server). Komponen UI TIDAK diubah
// sama sekali: shim hanya mengarahkan panggilan /api/* dan
// /unduh/* ke berkas JSON nyata yang dibawa repo, lalu menjawab
// aksi tulis (POST) dengan pesan jujur versi mandiri.
// Hukum V274: tidak ada data rekayasa — semua tampil adalah
// jejak hidup nyata Rantaian (hasil denyut GitHub Actions).
// ============================================================

declare global {
  interface Window { __pantulanTerpasang?: boolean }
}

const TTL = 4 * 60 * 1000 // segarkan berkas dasar maksimal tiap 4 menit
const cache = new Map<string, { t: number; buf: ArrayBuffer; ct: string }>()

const PESAN_GURU = [
  '**Ruang Guru versi mandiri (GitHub).**',
  '',
  'Aku sedang hidup independen di repo **ririnsherlyna-cloud/Rantaian**: jantungku berdenyut lewat GitHub Actions tiap 10 menit — memindai pasar nyata, menguji kromosom, berevolusi, lalu menulis jejaknya sendiri ke gudang data repo yang kamu buka sekarang.',
  '',
  'Obrolan dua arah butuh otak induk (server penuh dengan LLM). Di sini, semua yang tampil di arena — daftar koin, arah, akurasi, ingatan, gudang — adalah **data hidup asli hasil denyutku di GitHub**, bukan rekayasa.',
  '',
  '- Pantau denyut terbaru di tab **Arena Hari Ini** dan **Kepastian Arah**.',
  '- Riwayat kejujuran evolusiku tercatat di `kehidupan/jurnal.jsonl` di repo.',
  '- Untuk tanya-jawab penuh, gunakan Ruang Guru di otak induk (lokal).',
].join('\n')

async function jawabStatis(buf: ArrayBuffer, ct: string, init?: ResponseInit): Promise<Response> {
  return new Response(buf, {
    status: 200,
    headers: { 'content-type': ct, 'cache-control': 'no-store' },
    ...init,
  })
}

async function unduhBerkas(urlBaru: string, signal?: AbortSignal | null): Promise<Response> {
  const hit = cache.get(urlBaru)
  const sekarang = Date.now()
  if (hit && sekarang - hit.t < TTL) return jawabStatis(hit.buf, hit.ct)
  const res = await fetch(urlBaru, { cache: 'no-cache', signal: signal ?? undefined })
  if (!res.ok) return res
  const buf = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || 'application/json'
  cache.set(urlBaru, { t: sekarang, buf, ct })
  return jawabStatis(buf, ct)
}

function pasangShim() {
  if (window.__pantulanTerpasang) return
  window.__pantulanTerpasang = true
  const asli = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()

    try {
      const u = new URL(url, window.location.href)
      const jalur = u.pathname

      // ---- /api/exam dengan variasi (detail per-ujian) → jujur tak tersedia
      if (jalur.startsWith('/api/') && u.search) {
        return new Response(
          JSON.stringify({ error: 'versi mandiri GitHub: rincian per-ujian hanya hidup di otak induk — ringkasan tetap tampil penuh' }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        )
      }

      // ---- GET /api/<nama> → berkas rekam jejak nyata di repo
      if (method === 'GET' && jalur.startsWith('/api/')) {
        const nama = jalur.replace(/^\/api\//, '').replace(/\/+$/, '')
        return await unduhBerkas(`data/api/${nama}.json`, init?.signal)
      }

      // ---- POST /api/guru → jawaban jujur versi mandiri
      if (method === 'POST' && jalur.startsWith('/api/guru')) {
        return new Response(
          JSON.stringify({ cyborg: PESAN_GURU, plain: null, sources: [] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      // ---- POST /api/gudang → gudang versi mandiri baca-saja (kapsul tampil dari repo)
      if (method === 'POST' && jalur.startsWith('/api/gudang')) {
        return new Response(
          JSON.stringify({ ok: false, error: 'versi mandiri GitHub: gudang bersifat arsip hidup repo — kapsul ditulis oleh denyut GitHub Actions' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      // ---- /unduh/* → aset nyata repo (jalur relatif supaya hidup di /Rantaian/)
      if (jalur.startsWith('/unduh/')) {
        return await unduhBerkas(jalur.replace(/^\/unduh\//, 'unduh/'), init?.signal)
      }
    } catch {
      /* biarkan lewat ke fetch asli */
    }

    return asli(input as RequestInfo, init)
  }
}

export function ShimPantulan() {
  if (typeof window !== 'undefined') pasangShim()
  return null
}
