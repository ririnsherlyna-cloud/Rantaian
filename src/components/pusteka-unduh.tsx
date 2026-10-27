'use client'

import { useCallback, useEffect, useState } from 'react'

interface EntriManifest {
  nama: string
  namaAsli: string
  label: string
  kategori: 'CYBORG' | 'PAKET' | 'LAPORAN' | 'BUKTI'
  deskripsi: string
  byte: number
  ukuran: string
  diubah: string
  sha256: string
  unduh: string
  utama: boolean
}

interface Manifest {
  dihasilkan: string
  sumber: string
  jumlah: number
  entri: EntriManifest[]
}

const WARNA_KATEGORI: Record<string, string> = {
  CYBORG: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  PAKET: 'bg-amber-500/15 text-amber-300 ring-amber-500/40',
  LAPORAN: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/40',
  BUKTI: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/40',
}

function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function PustekaUnduh({ onKembali }: { onKembali: () => void }) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [gagal, setGagal] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [tersalin, setTersalin] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    setGagal(null)
    try {
      const res = await fetch('/unduh/manifest.json', { cache: 'no-store' })
      if (!res.ok) throw new Error('manifest.json → HTTP ' + res.status)
      const data = (await res.json()) as Manifest
      if (!data.entri || !Array.isArray(data.entri) || data.entri.length === 0) {
        throw new Error('manifest kosong')
      }
      setManifest(data)
    } catch (e) {
      setGagal(e instanceof Error ? e.message : 'Gagal memuat manifest')
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  const salinHash = useCallback(async (nama: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setTersalin(nama)
      setTimeout(() => setTersalin(null), 1500)
    } catch {
      /* clipboard bisa ditolak browser — hash tetap terlihat */
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        {/* HEADER */}
        <header className="mb-6">
          <button
            onClick={onKembali}
            className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Kembali ke arena MICAPROFITA"
          >
            ← Kembali ke ARENA
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            PUSTEKA UNDUH <span className="text-emerald-400">MICAPROFITA</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Lampiran chat sedang bermasalah — halaman ini dilayani <strong className="text-zinc-200">langsung dari server</strong>.
            Klik <em>Unduh</em> untuk mengambil file utuh; ukuran, tanggal, dan SHA256 tertera untuk verifikasi keaslian.
          </p>
        </header>

        {/* ISI */}
        <main className="flex-1">
          {memuat && (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-6" role="status">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" aria-hidden="true" />
              <span className="text-sm text-zinc-300">Memuat daftar file dari server…</span>
            </div>
          )}

          {gagal && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6" role="alert">
              <p className="font-semibold text-red-300">Gagal memuat daftar unduhan</p>
              <p className="mt-1 text-sm text-red-200/80">{gagal}</p>
              <button
                onClick={() => void muat()}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {manifest && (
            <>
              <p className="mb-4 text-xs text-zinc-500">
                {manifest.jumlah} file tersedia · daftar dibuat {formatTanggal(manifest.dihasilkan)} · sumber: server lokal
              </p>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {manifest.entri.map((e) => (
                  <li
                    key={e.nama}
                    className={
                      'flex flex-col rounded-xl border bg-zinc-900 p-4 sm:p-5 ' +
                      (e.utama ? 'border-emerald-800/60 shadow-[0_0_24px_rgba(16,185,129,0.08)]' : 'border-zinc-800')
                    }
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ' + (WARNA_KATEGORI[e.kategori] ?? WARNA_KATEGORI.LAPORAN)}>
                        {e.kategori}
                      </span>
                      {e.utama && (
                        <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-950">
                          Utama
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm font-bold leading-snug text-white sm:text-base">{e.label}</h2>
                    <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-zinc-400">{e.deskripsi}</p>

                    <dl className="mt-3 space-y-1 text-[12px] text-zinc-500">
                      <div className="flex gap-2">
                        <dt className="sr-only">Ukuran dan tanggal</dt>
                        <dd>
                          <span className="font-semibold text-zinc-300">{e.ukuran}</span> · diubah {formatTanggal(e.diubah)}
                        </dd>
                      </div>
                      <div>
                        <dt className="sr-only">SHA256</dt>
                        <dd className="flex items-center gap-2">
                          <code className="max-w-[16rem] truncate rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400" title={e.sha256}>
                            sha256: {e.sha256.slice(0, 16)}…
                          </code>
                          <button
                            onClick={() => void salinHash(e.nama, e.sha256)}
                            className="min-h-[32px] rounded px-2 text-[11px] text-emerald-400 transition-colors hover:text-emerald-300"
                            aria-label={'Salin SHA256 dari ' + e.namaAsli}
                          >
                            {tersalin === e.nama ? 'Tersalin ✓' : 'Salin'}
                          </button>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={e.unduh}
                        download={e.namaAsli}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                        aria-label={'Unduh ' + e.namaAsli}
                      >
                        ⬇ Unduh
                      </a>
                      {e.nama.toLowerCase().endsWith('.html') && (
                        <a
                          href={e.unduh}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-700 hover:text-emerald-300"
                          aria-label={'Buka ' + e.namaAsli + ' di tab browser'}
                        >
                          Buka di Browser ↗
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>

        {/* FOOTER — menempel di bawah saat konten pendek, terdorong saat panjang */}
        <footer className="mt-auto pt-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-[12px] leading-relaxed text-zinc-500">
            <p>
              <strong className="text-zinc-300">Verifikasi keaslian:</strong> setelah diunduh, cocokkan SHA256 file dengan yang tertera
              (mis. <code className="font-mono">sha256sum namafile</code>). File dilayani statis dari folder <code className="font-mono">public/unduh/</code> server.
            </p>
            <p className="mt-1">
              Zona unduh diperbarui otomatis oleh pipeline: <code className="font-mono">bash scripts/package_taskfiles.sh && bun scripts/siapkan_unduh.ts</code>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
